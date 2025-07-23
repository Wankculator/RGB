# 🚀 LIGHTCAT Production Setup Guide

## 📋 Overview

This guide follows CLAUDE.md excellence standards to set up LIGHTCAT for production. We'll start with testnet for safety, then move to mainnet.

## 🎯 Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Web Client    │────▶│   API Server    │────▶│  RGB Node       │
│  (React + Game) │     │   (Node.js)     │     │                 │
│                 │     │                 │     └─────────────────┘
└─────────────────┘     └────────┬────────┘              │
                                 │                        │
                    ┌────────────┴────────────┐          │
                    │                         │          │
              ┌─────▼──────┐          ┌──────▼─────┐    │
              │            │          │            │    │
              │  Supabase  │          │ Lightning  │────┘
              │  Database  │          │    Node    │
              │            │          │            │
              └────────────┘          └────────────┘
```

## 🔧 Step 1: Server Setup

### Option A: DigitalOcean (Recommended)
```bash
# Create Ubuntu 22.04 droplet
# Recommended: 4GB RAM, 2 vCPUs, 80GB SSD
# Cost: ~$24/month

# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y nodejs npm nginx certbot python3-certbot-nginx git postgresql-client
```

### Option B: AWS EC2
```bash
# Launch Ubuntu 22.04 instance
# Recommended: t3.medium
# Configure security group for ports 80, 443, 3000
```

## 🗄️ Step 2: Database Setup (Supabase)

### 2.1 Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Save connection details

### 2.2 Run Database Migration
```bash
# On your local machine
cd litecat-website

# Get connection string from Supabase dashboard
export DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"

# Run migration
psql $DATABASE_URL < database/rgb-schema.sql
```

### 2.3 Verify Tables Created
```sql
-- In Supabase SQL editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show:
-- rgb_invoices
-- rgb_payments
-- rgb_consignments
-- users
-- game_scores
```

## ⚡ Step 3: Lightning Network Setup

### Option A: Voltage Cloud (Easiest)
```bash
# 1. Sign up at https://voltage.cloud
# 2. Create new LND node
# 3. Download credentials (admin.macaroon, tls.cert)
# 4. Get connection details
```

### Option B: Self-Hosted LND
```bash
# Install LND
wget https://github.com/lightningnetwork/lnd/releases/download/v0.17.3-beta/lnd-linux-amd64-v0.17.3-beta.tar.gz
tar -xzf lnd-linux-amd64-v0.17.3-beta.tar.gz
sudo mv lnd-linux-amd64-v0.17.3-beta/lnd /usr/local/bin/
sudo mv lnd-linux-amd64-v0.17.3-beta/lncli /usr/local/bin/

# Create config
mkdir ~/.lnd
cat > ~/.lnd/lnd.conf << EOF
[Application Options]
alias=LIGHTCAT-NODE
color=#FFFF00
debuglevel=info
maxpendingchannels=10

[Bitcoin]
bitcoin.active=true
bitcoin.testnet=true
bitcoin.node=neutrino

[Neutrino]
neutrino.connect=testnet1-btcd.zaphq.io
neutrino.connect=testnet2-btcd.zaphq.io
EOF

# Start LND
lnd

# In another terminal, create wallet
lncli create

# Get info
lncli getinfo
```

## 🔴 Step 4: RGB Protocol Setup

### 4.1 Install RGB Node
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Clone and build RGB node
git clone https://github.com/RGB-WG/rgb-node
cd rgb-node
cargo build --release
sudo mv target/release/rgbd /usr/local/bin/
sudo mv target/release/rgb-cli /usr/local/bin/

# Create config directory
mkdir ~/.rgb
```

### 4.2 Create RGB Asset (Testnet First!)
```bash
# Start RGB daemon
rgbd --network testnet

# In another terminal, create wallet
rgb-cli wallet create lightcat_wallet

# Issue LIGHTCAT tokens
rgb-cli asset issue \
  --ticker "LCAT" \
  --name "LIGHTCAT" \
  --description "First cat meme token on RGB Protocol" \
  --supply 21000000 \
  --precision 0 \
  --wallet lightcat_wallet

# Save the returned asset_id!
# Example: rgb:2X5sQH-qVLmqVa-NZmBwqX-4N6Nwtr-Gpk2g97-BiXWNgF
```

### 4.3 Verify Token Creation
```bash
# Check balance
rgb-cli wallet balance lightcat_wallet

# Should show:
# LCAT: 21,000,000
```

## 🔐 Step 5: Application Deployment

### 5.1 Clone Repository
```bash
cd /var/www
git clone https://github.com/your-repo/litecat-website.git
cd litecat-website
```

### 5.2 Install Dependencies
```bash
npm install --production
```

### 5.3 Configure Environment
```bash
# Copy and edit .env
cp .env.example .env
nano .env

# Key configurations:
# - All Supabase credentials
# - RGB asset ID from step 4.2
# - Lightning node details
# - JWT secret (generate with: openssl rand -base64 64)
```

### 5.4 Build Application
```bash
npm run build
```

### 5.5 Setup PM2 Process Manager
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'lightcat-api',
    script: './server/app.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './server/logs/err.log',
    out_file: './server/logs/out.log',
    log_file: './server/logs/combined.log',
    time: true
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Step 6: Nginx & SSL Setup

### 6.1 Configure Nginx
```bash
# Create site config
sudo nano /etc/nginx/sites-available/lightcat

# Add configuration:
server {
    listen 80;
    server_name lightcat.xyz www.lightcat.xyz;
    
    location / {
        root /var/www/litecat-website/client;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/lightcat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6.2 SSL Certificate
```bash
# Get Let's Encrypt certificate
sudo certbot --nginx -d lightcat.xyz -d www.lightcat.xyz

# Auto-renewal
sudo certbot renew --dry-run
```

## 📊 Step 7: Monitoring Setup

### 7.1 Application Monitoring (Sentry)
```bash
# Sign up at https://sentry.io
# Get DSN and add to .env
# SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### 7.2 Server Monitoring
```bash
# Install Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access at http://your-server:19999
```

### 7.3 Uptime Monitoring
```bash
# Use UptimeRobot or Pingdom
# Monitor endpoints:
# - https://lightcat.xyz (200 OK)
# - https://lightcat.xyz/api/health (200 OK)
# - https://lightcat.xyz/api/rgb/stats (200 OK)
```

## 🔒 Step 8: Security Hardening

### 8.1 Firewall Setup
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000 # Only if needed for development
sudo ufw enable
```

### 8.2 Fail2ban Setup
```bash
# Install fail2ban
sudo apt install fail2ban

# Configure for nginx
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl restart fail2ban
```

### 8.3 Security Headers
```nginx
# Add to nginx config
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;" always;
```

## 🔄 Step 9: Backup Strategy

### 9.1 Database Backups
```bash
# Create backup script
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup Supabase
pg_dump $DATABASE_URL > $BACKUP_DIR/lightcat_$DATE.sql
gzip $BACKUP_DIR/lightcat_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-db.sh

# Add to crontab
crontab -e
# Add: 0 3 * * * /home/ubuntu/backup-db.sh
```

### 9.2 Application Backups
```bash
# Backup script for configs and uploads
cat > /home/ubuntu/backup-app.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf /home/ubuntu/backups/app_$DATE.tar.gz \
  /var/www/litecat-website/.env \
  /var/www/litecat-website/server/uploads \
  /home/ubuntu/.lnd/data/chain/bitcoin/testnet/admin.macaroon \
  /home/ubuntu/.rgb
EOF

chmod +x /home/ubuntu/backup-app.sh
```

## ✅ Step 10: Launch Checklist

### Pre-Launch Testing
- [ ] Create test purchase with testnet RGB invoice
- [ ] Verify Lightning payment completes
- [ ] Confirm RGB consignment downloads
- [ ] Test game and tier unlocks
- [ ] Check mobile responsiveness
- [ ] Verify rate limiting works
- [ ] Test error handling

### Security Review
- [ ] All secrets in environment variables
- [ ] SSL certificate active
- [ ] Firewall configured
- [ ] Backups running
- [ ] Monitoring active
- [ ] Error logging configured

### Performance Check
- [ ] Page load < 2 seconds
- [ ] API response < 500ms
- [ ] Game loads smoothly
- [ ] Database queries optimized

### Go-Live Steps
1. **Final backup of everything**
2. **Switch DNS to new server**
3. **Monitor error logs closely**
4. **Have rollback plan ready**
5. **Announce launch! 🎉**

## 🆘 Troubleshooting

### RGB Node Issues
```bash
# Check RGB daemon status
ps aux | grep rgbd

# Check RGB logs
tail -f ~/.rgb/debug.log

# Resync wallet
rgb-cli wallet sync lightcat_wallet
```

### Lightning Issues
```bash
# Check LND status
lncli getinfo

# Check channel balance
lncli channelbalance

# Check pending invoices
lncli listinvoices
```

### Application Issues
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs lightcat-api

# Restart if needed
pm2 restart lightcat-api
```

## 📞 Support Resources

- **RGB Protocol**: https://rgb.tech
- **Lightning Network**: https://docs.lightning.engineering
- **Supabase**: https://supabase.com/docs
- **This Guide**: Update as you learn!

---

**Remember: Start with TESTNET first! Only move to mainnet when everything is thoroughly tested.**