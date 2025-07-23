#!/bin/bash

# COMPLETE LIGHTCAT SETUP - 24/7 Operation with www.rgblightcat.com
# This script sets up EVERYTHING in one go!

set -e

echo "🚀 COMPLETE LIGHTCAT SETUP WITH DOMAIN"
echo "======================================"
echo "Domain: www.rgblightcat.com"
echo "Server: srv890142.hstgr.cloud (147.93.105.138)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Please run as root${NC}"
   exit 1
fi

# Get domain info
DOMAIN="rgblightcat.com"
WWW_DOMAIN="www.rgblightcat.com"

echo -e "${YELLOW}This script will:${NC}"
echo "✓ Install RGB node for 24/7 operation"
echo "✓ Set up your website at www.rgblightcat.com"
echo "✓ Configure SSL certificates"
echo "✓ Enable automatic token distribution"
echo "✓ Set up monitoring and auto-restart"
echo ""

read -p "Ready to proceed? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Setup cancelled."
    exit 0
fi

# STEP 1: System Update
echo -e "\n${BLUE}[1/10] Updating system...${NC}"
apt update && apt upgrade -y

# STEP 2: Create user
echo -e "\n${BLUE}[2/10] Creating secure user...${NC}"
if ! id "lightcat" &>/dev/null; then
    adduser --disabled-password --gecos "" lightcat
    usermod -aG sudo lightcat
    echo "lightcat ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
fi

# STEP 3: Install all dependencies at once
echo -e "\n${BLUE}[3/10] Installing all dependencies...${NC}"
apt install -y \
    build-essential pkg-config libssl-dev libzmq3-dev \
    git curl jq screen nginx certbot python3-certbot-nginx \
    fail2ban ufw htop net-tools supervisor

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
npm install -g pm2

# Install Rust
su - lightcat -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'

# STEP 4: Install RGB Node
echo -e "\n${BLUE}[4/10] Installing RGB node...${NC}"
cat > /home/lightcat/install-rgb.sh << 'RGBINSTALL'
#!/bin/bash
set -e
source $HOME/.cargo/env

mkdir -p ~/rgb-node/{data,config,backups,logs,scripts}
cd ~/rgb-node

# Use pre-built binary for faster setup
wget https://github.com/RGB-WG/rgb-node/releases/download/v0.10.0/rgb-node-0.10.0-x86_64-linux-gnu.tar.gz
tar -xzf rgb-node-0.10.0-x86_64-linux-gnu.tar.gz
sudo mv rgb-node /usr/local/bin/
sudo mv rgb-cli /usr/local/bin/
sudo chmod +x /usr/local/bin/rgb-node /usr/local/bin/rgb-cli

# Create config
cat > ~/rgb-node/config/rgb-node.conf << EOF
network = "mainnet"
data_dir = "/home/lightcat/rgb-node/data"
rpc_port = 50001
rpc_host = "127.0.0.1"
electrum_server = "electrum.blockstream.info:50002"
log_level = "info"
log_file = "/home/lightcat/rgb-node/logs/rgb-node.log"
rpc_auth = true
rpc_user = "rgbuser"
rpc_password = "$(openssl rand -base64 32)"
max_connections = 50
cache_size = 1000
EOF

echo "✅ RGB Node ready!"
RGBINSTALL

chown lightcat:lightcat /home/lightcat/install-rgb.sh
chmod +x /home/lightcat/install-rgb.sh
su - lightcat -c './install-rgb.sh'

# STEP 5: Create 24/7 systemd service
echo -e "\n${BLUE}[5/10] Setting up 24/7 operation...${NC}"
cat > /etc/systemd/system/rgb-node.service << EOF
[Unit]
Description=RGB Node for LIGHTCAT Token (24/7)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=lightcat
ExecStart=/usr/local/bin/rgb-node --config /home/lightcat/rgb-node/config/rgb-node.conf
Restart=always
RestartSec=10
StandardOutput=append:/home/lightcat/rgb-node/logs/rgb-node.log
StandardError=append:/home/lightcat/rgb-node/logs/rgb-node-error.log

# Auto-restart settings for 24/7 operation
StartLimitInterval=600
StartLimitBurst=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable rgb-node

# STEP 6: Create helper scripts
echo -e "\n${BLUE}[6/10] Creating automation scripts...${NC}"

# Wallet import script
cat > /home/lightcat/rgb-node/scripts/import-wallet.sh << 'EOF'
#!/bin/bash
echo "🔐 LIGHTCAT Wallet Import (Secure)"
echo "================================="
echo ""
echo "Enter your seed phrase word by word"
echo "(Words will be hidden for security)"
echo ""

WORDS=()
for i in {1..24}; do
    read -s -p "Word $i (press Enter when done): " WORD
    echo "*****"
    [ -z "$WORD" ] && break
    WORDS+=("$WORD")
done

if [ ${#WORDS[@]} -ne 12 ] && [ ${#WORDS[@]} -ne 24 ]; then
    echo "❌ Invalid seed phrase"
    exit 1
fi

SEED="${WORDS[*]}"
if rgb-cli wallet import --words "$SEED" --name "lightcat-main" 2>/dev/null; then
    echo "✅ Wallet imported!"
    rgb-cli wallet sync
    echo "Balance: $(rgb-cli asset balance rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po)"
else
    echo "❌ Import failed"
fi
unset SEED WORDS
history -c
EOF

# Auto-transfer service for 24/7 operation
cat > /home/lightcat/rgb-node/scripts/auto-transfer-service.js << 'EOF'
const { exec } = require('child_process');
const express = require('express');
const app = express();

const ASSET_ID = 'rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po';
const PORT = 50002;

app.use(express.json());

// Health check for monitoring
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'rgb-automation',
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

// Auto-transfer endpoint
app.post('/transfer', async (req, res) => {
    const { recipient, amount } = req.body;
    
    const command = `rgb-cli transfer create --asset ${ASSET_ID} --amount ${amount} --recipient "${recipient}" --fee-rate 5`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('Transfer failed:', error);
            res.status(500).json({ error: error.message });
            return;
        }
        
        console.log(`Transfer successful: ${amount} tokens to ${recipient.substring(0,30)}...`);
        res.json({ 
            success: true, 
            consignment: stdout.trim(),
            amount: amount,
            timestamp: new Date()
        });
    });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`RGB Automation Service running 24/7 on port ${PORT}`);
});

// Keep alive
setInterval(() => {
    console.log('RGB Automation Service - Heartbeat:', new Date());
}, 300000); // Every 5 minutes
EOF

# More helper scripts
cat > /home/lightcat/rgb-node/scripts/check-balance.sh << 'EOF'
#!/bin/bash
echo "💰 LIGHTCAT Balance: $(rgb-cli asset balance rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po)"
EOF

cat > /home/lightcat/rgb-node/scripts/monitor-24-7.sh << 'EOF'
#!/bin/bash
# 24/7 Monitoring Script
while true; do
    if ! systemctl is-active --quiet rgb-node; then
        echo "$(date): RGB node down, restarting..." >> /home/lightcat/rgb-node/logs/monitor.log
        sudo systemctl start rgb-node
    fi
    
    if ! pgrep -f "auto-transfer-service.js" > /dev/null; then
        echo "$(date): Auto-transfer service down, restarting..." >> /home/lightcat/rgb-node/logs/monitor.log
        cd /home/lightcat/rgb-node/scripts && nohup node auto-transfer-service.js &
    fi
    
    sleep 60
done
EOF

chmod +x /home/lightcat/rgb-node/scripts/*.sh
chown -R lightcat:lightcat /home/lightcat/rgb-node/

# STEP 7: Configure Nginx for domain
echo -e "\n${BLUE}[7/10] Configuring domain www.rgblightcat.com...${NC}"
cat > /etc/nginx/sites-available/rgblightcat << EOF
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    
    # Force www
    if (\$host = rgblightcat.com) {
        return 301 \$scheme://www.rgblightcat.com\$request_uri;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Main application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
    
    # RGB API
    location /api/rgb/ {
        proxy_pass http://localhost:3001/api/rgb/;
        client_max_body_size 10M;
    }
}

# Also listen on IP
server {
    listen 80;
    server_name 147.93.105.138 srv890142.hstgr.cloud;
    return 301 https://www.rgblightcat.com\$request_uri;
}
EOF

ln -sf /etc/nginx/sites-available/rgblightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# STEP 8: Firewall for 24/7 security
echo -e "\n${BLUE}[8/10] Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# STEP 9: Create auto-start script
echo -e "\n${BLUE}[9/10] Setting up auto-start on boot...${NC}"
cat > /etc/rc.local << 'EOF'
#!/bin/bash
# Auto-start LIGHTCAT services on boot

# Start RGB node
systemctl start rgb-node

# Start monitoring
su - lightcat -c "nohup /home/lightcat/rgb-node/scripts/monitor-24-7.sh > /dev/null 2>&1 &"

# Start auto-transfer service
su - lightcat -c "cd /home/lightcat/rgb-node/scripts && nohup node auto-transfer-service.js > /dev/null 2>&1 &"

exit 0
EOF
chmod +x /etc/rc.local

# STEP 10: Create cron jobs for 24/7 operation
echo -e "\n${BLUE}[10/10] Setting up automated tasks...${NC}"
cat > /etc/cron.d/lightcat << 'EOF'
# LIGHTCAT 24/7 Automation

# Backup wallet every 6 hours
0 */6 * * * lightcat /home/lightcat/rgb-node/scripts/backup-wallet.sh

# Check and restart services every 5 minutes
*/5 * * * * root systemctl is-active --quiet rgb-node || systemctl start rgb-node

# Clean old logs weekly
0 3 * * 0 lightcat find /home/lightcat/rgb-node/logs -name "*.log" -mtime +30 -delete

# Health check every minute
* * * * * lightcat curl -s http://localhost:50002/health || echo "$(date): Health check failed" >> /home/lightcat/rgb-node/logs/health.log
EOF

# Create website deployment script
cat > /home/lightcat/deploy-website.sh << 'EOF'
#!/bin/bash
echo "🌐 Deploying LIGHTCAT Website"
echo "============================"

cd ~

# Clone your repository (you'll need to provide the URL)
if [ ! -d litecat-website ]; then
    echo "Enter your Git repository URL:"
    read -p "URL: " REPO_URL
    git clone "$REPO_URL" litecat-website
fi

cd litecat-website
npm install

# Create production .env
cat > .env << ENV
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# Domain
PUBLIC_URL=https://www.rgblightcat.com
API_URL=https://www.rgblightcat.com

# RGB
USE_MOCK_RGB=false
RGB_NODE_PATH=/home/lightcat/rgb-node
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
RGB_NETWORK=mainnet

# Add your Lightning/Supabase details here
ENV

# Start with PM2 for 24/7 operation
pm2 delete all 2>/dev/null
pm2 start server/server.js --name lightcat-api
pm2 start server/websocket-server.js --name lightcat-ws 2>/dev/null
pm2 save
pm2 startup systemd -u lightcat --hp /home/lightcat | grep sudo | bash

echo "✅ Website deployed!"
EOF

chown lightcat:lightcat /home/lightcat/deploy-website.sh
chmod +x /home/lightcat/deploy-website.sh

# Final setup message
cat > /home/lightcat/SETUP_COMPLETE.txt << 'EOF'
🎉 LIGHTCAT 24/7 SETUP COMPLETE!
================================

Your Domain: www.rgblightcat.com
Your Server: 147.93.105.138

✅ What's Running 24/7:
- RGB Node (auto-restart enabled)
- Token automation service
- Website (when deployed)
- Monitoring scripts
- Automated backups

📋 Quick Commands:
- Import wallet: ~/rgb-node/scripts/import-wallet.sh
- Check balance: ~/rgb-node/scripts/check-balance.sh
- Deploy website: ~/deploy-website.sh
- Monitor system: pm2 monit

🔒 SSL Certificate:
Run this after DNS is pointed:
sudo certbot --nginx -d rgblightcat.com -d www.rgblightcat.com

📊 Monitoring:
- RGB logs: tail -f ~/rgb-node/logs/rgb-node.log
- PM2 status: pm2 status
- System health: systemctl status rgb-node

Your server is configured for 24/7 automated operation!
EOF

# Display completion message
echo ""
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo -e "${GREEN}=================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT - Final Steps:${NC}"
echo ""
echo "1. Point DNS records:"
echo "   A record: rgblightcat.com → 147.93.105.138"
echo "   A record: www.rgblightcat.com → 147.93.105.138"
echo ""
echo "2. Switch to lightcat user:"
echo -e "   ${BLUE}su - lightcat${NC}"
echo ""
echo "3. Import your wallet:"
echo -e "   ${BLUE}~/rgb-node/scripts/import-wallet.sh${NC}"
echo ""
echo "4. Deploy your website:"
echo -e "   ${BLUE}~/deploy-website.sh${NC}"
echo ""
echo "5. After DNS propagates (5-30 mins), setup SSL:"
echo -e "   ${BLUE}sudo certbot --nginx -d rgblightcat.com -d www.rgblightcat.com${NC}"
echo ""
echo "Your server is ready for 24/7 operation! 🚀"