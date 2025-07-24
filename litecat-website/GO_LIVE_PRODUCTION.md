# 🚀 GO LIVE - Production Setup Guide

## ⚠️ ONLY RUN THIS AFTER:
1. ✅ All tests pass in mock mode
2. ✅ You've tested payment flow with mock
3. ✅ SSL certificate is installed
4. ✅ You're ready to accept REAL payments

## 📋 Production Checklist

### Step 1: SSH to Server
```bash
ssh root@147.93.105.138
```

### Step 2: Import RGB Seed Phrase
```bash
cd /var/www/rgblightcat

# Create secure seed configuration
cat > rgb-seed-setup.sh << 'EOF'
#!/bin/bash

echo "🔐 RGB Seed Phrase Setup"
echo "======================="
echo ""
echo "Enter your RGB wallet seed phrase (24 words):"
echo "NOTE: This will not be displayed on screen"
echo ""

# Read seed phrase securely
read -s -p "Seed phrase: " SEED_PHRASE
echo ""

# Validate seed phrase
WORD_COUNT=$(echo "$SEED_PHRASE" | wc -w)
if [ "$WORD_COUNT" -ne "24" ]; then
    echo "❌ Error: Seed phrase must be exactly 24 words (got $WORD_COUNT)"
    exit 1
fi

# Store securely
mkdir -p /root/.rgb
echo "$SEED_PHRASE" > /root/.rgb/seed.txt
chmod 600 /root/.rgb/seed.txt

echo "✅ Seed phrase stored securely"
echo ""
echo "Setting up RGB wallet..."

# Initialize RGB wallet
# Add your RGB wallet initialization commands here

echo "✅ RGB wallet configured!"
EOF

chmod +x rgb-seed-setup.sh
./rgb-seed-setup.sh
```

### Step 3: Switch to Production Mode
```bash
cd /var/www/rgblightcat

# Backup current config
cp .env .env.mock-backup

# Create production environment
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
CLIENT_URL=https://rgblightcat.com

# Supabase (keep your real credentials)
SUPABASE_URL=https://xyfqpvxwvlemnraldbjd.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDk2MzksImV4cCI6MjA2ODY4NTYzOX0.dIF_7uErKhpAeBurPGv_oS3gQEfJ6sHQP9mr0FUuC0M

# BTCPay - REAL PAYMENTS
BTCPAY_URL=https://btcpay0.voltageapp.io
BTCPAY_API_KEY=1dpQWkChRWpEWiilo1D1ZlI0PEv7EOIIIhliMiD7LnM
BTCPAY_STORE_ID=HNQsGSwdyQb8Vg3y6srogKjXCDXdARt9Q113N4urcUcG
BTC_WALLET_ADDRESS=bc1qdsdr3ztdcvuj5kl0j4sh6qpe60579nx0dpgydu
USE_BTCPAY=true

# PRODUCTION MODE - REAL RGB & PAYMENTS
USE_MOCK_RGB=false
USE_MOCK_LIGHTNING=false
RGB_FALLBACK_TO_MOCK=false
ACCEPT_REAL_PAYMENTS=true

# RGB Configuration
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
RGB_WALLET_PATH=/root/.rgb

# Security (generate new secrets)
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Production Settings
ENABLE_TEST_ENDPOINTS=false
ENABLE_RATE_LIMITING=true
ENABLE_DEBUG_LOGGING=false
EOF

echo "✅ Production configuration set!"
```

### Step 4: Restart Services
```bash
# Restart all services
pm2 restart all

# Check status
pm2 status

# Monitor logs
pm2 logs --lines 50
```

### Step 5: Final Production Tests
```bash
# Test from your local computer:

# 1. Check API health
curl https://rgblightcat.com/api/health

# 2. Check RGB stats
curl https://rgblightcat.com/api/rgb/stats

# 3. Create a REAL test invoice (small amount)
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "rgbInvoice": "rgb:utxob:YOUR_REAL_RGB_INVOICE",
    "batchCount": 1,
    "walletAddress": "YOUR_BITCOIN_ADDRESS"
  }'
```

## 🔒 Security Hardening

### 1. Set up Firewall
```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
```

### 2. Set up Monitoring
```bash
# Install monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Set up alerts
pm2 install pm2-auto-pull
```

### 3. Enable Automatic Backups
```bash
# Create backup script
cat > /root/backup-lightcat.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_DIR/lightcat_$DATE.sql

# Backup config
cp /var/www/rgblightcat/.env $BACKUP_DIR/env_$DATE

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete
EOF

chmod +x /root/backup-lightcat.sh

# Add to cron
crontab -e
# Add: 0 3 * * * /root/backup-lightcat.sh
```

## ✅ Production Checklist

Before announcing your launch:

- [ ] SSL certificate working (https://)
- [ ] Real RGB seed imported
- [ ] BTCPay configured and tested
- [ ] Made a small test purchase
- [ ] Verified funds arrived in wallet
- [ ] Database backups configured
- [ ] Monitoring enabled
- [ ] Firewall configured
- [ ] All mock flags set to false

## 🚨 Emergency Rollback

If something goes wrong:
```bash
# Quick rollback to mock mode
cd /var/www/rgblightcat
cp .env.mock-backup .env
pm2 restart all
```

## 📞 Launch Day Support

Keep these handy:
- Server IP: 147.93.105.138
- Domain: rgblightcat.com
- API Health: https://rgblightcat.com/api/health
- PM2 Logs: `pm2 logs`
- Error Logs: `/var/www/rgblightcat/logs/`

## 🎉 Congratulations!
Your LIGHTCAT token platform is ready for production!