#!/bin/bash

# LIGHTCAT RGB Node Setup for Mumbai VPS (147.93.105.138)
# Customized for srv890142.hstgr.cloud

set -e

echo "🚀 LIGHTCAT RGB Node Setup for Mumbai VPS"
echo "========================================="
echo "Server: srv890142.hstgr.cloud (147.93.105.138)"
echo "OS: Ubuntu 25.04"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Please run as root${NC}"
   exit 1
fi

echo -e "${YELLOW}Starting automated setup...${NC}"

# Step 1: System Update
echo -e "\n${BLUE}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Step 2: Create lightcat user
echo -e "\n${BLUE}👤 Creating lightcat user...${NC}"
if ! id "lightcat" &>/dev/null; then
    adduser --disabled-password --gecos "" lightcat
    usermod -aG sudo lightcat
    echo "lightcat ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
    echo -e "${GREEN}✓ User created${NC}"
else
    echo -e "${YELLOW}User already exists${NC}"
fi

# Step 3: Install all dependencies
echo -e "\n${BLUE}📦 Installing dependencies...${NC}"
apt install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    libzmq3-dev \
    git \
    curl \
    jq \
    screen \
    nginx \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    ufw \
    htop \
    net-tools

# Step 4: Install Node.js 18
echo -e "\n${BLUE}📦 Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Step 5: Install PM2 globally
npm install -g pm2

# Step 6: Install Rust for lightcat user
echo -e "\n${BLUE}🦀 Installing Rust...${NC}"
su - lightcat -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'

# Step 7: Create and run RGB installation
echo -e "\n${BLUE}🔧 Installing RGB node...${NC}"

# Create installation script for lightcat
cat > /home/lightcat/install-rgb.sh << 'EOF'
#!/bin/bash
set -e

# Load Rust
source $HOME/.cargo/env

# Create directories
mkdir -p ~/rgb-node/{data,config,backups,logs,scripts}
cd ~/rgb-node

# Clone and build RGB node
echo "Cloning RGB node repository..."
git clone https://github.com/RGB-WG/rgb-node.git
cd rgb-node
git checkout v0.10.0

echo "Building RGB node (this may take a few minutes)..."
cargo build --release

# Install binaries
echo "Installing RGB binaries..."
sudo cp target/release/rgb-node /usr/local/bin/
sudo cp target/release/rgb-cli /usr/local/bin/
sudo chmod +x /usr/local/bin/rgb-node
sudo chmod +x /usr/local/bin/rgb-cli

# Create configuration
echo "Creating configuration..."
cat > ~/rgb-node/config/rgb-node.conf << CONF
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
CONF

echo "✅ RGB Node installed successfully!"
EOF

chown lightcat:lightcat /home/lightcat/install-rgb.sh
chmod +x /home/lightcat/install-rgb.sh

# Run installation as lightcat
su - lightcat -c './install-rgb.sh'

# Step 8: Create systemd service
echo -e "\n${BLUE}🔧 Creating RGB node service...${NC}"
cat > /etc/systemd/system/rgb-node.service << EOF
[Unit]
Description=RGB Node for LIGHTCAT Token
After=network.target

[Service]
Type=simple
User=lightcat
ExecStart=/usr/local/bin/rgb-node --config /home/lightcat/rgb-node/config/rgb-node.conf
Restart=always
RestartSec=10
StandardOutput=append:/home/lightcat/rgb-node/logs/rgb-node.log
StandardError=append:/home/lightcat/rgb-node/logs/rgb-node-error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable rgb-node

# Step 9: Create all helper scripts
echo -e "\n${BLUE}📝 Creating helper scripts...${NC}"

# Main wallet import script
cat > /home/lightcat/rgb-node/scripts/import-wallet.sh << 'EOF'
#!/bin/bash

echo "🔐 LIGHTCAT Wallet Import"
echo "========================"
echo ""
echo "This will import your seed phrase securely."
echo "Words will be hidden as you type."
echo ""
echo "SECURITY NOTES:"
echo "- Make sure no one can see your screen"
echo "- The seed phrase will not be displayed"
echo "- History will be cleared after import"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

WORDS=()
echo "Enter your seed phrase word by word:"
echo "(Press Enter after the last word)"
echo ""

i=1
while true; do
    read -s -p "Word $i: " WORD
    echo "*****" # Show asterisks for feedback
    
    if [ -z "$WORD" ]; then
        if [ $i -eq 1 ]; then
            echo "No words entered. Exiting."
            exit 1
        fi
        break
    fi
    
    WORDS+=("$WORD")
    i=$((i+1))
done

# Validate word count
TOTAL=${#WORDS[@]}
if [ $TOTAL -ne 12 ] && [ $TOTAL -ne 24 ]; then
    echo ""
    echo "❌ Invalid seed phrase. Expected 12 or 24 words, got $TOTAL"
    exit 1
fi

echo ""
echo "✓ Received $TOTAL words"
echo "Importing wallet..."

# Join words
SEED="${WORDS[*]}"

# Import wallet
if rgb-cli wallet import --words "$SEED" --name "lightcat-main" 2>/dev/null; then
    echo "✅ Wallet imported successfully!"
    
    # Clear sensitive data
    unset SEED WORDS WORD
    
    echo "🔄 Syncing wallet..."
    rgb-cli wallet sync
    
    echo ""
    echo "💰 Checking LIGHTCAT balance..."
    BALANCE=$(rgb-cli asset balance rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po 2>/dev/null || echo "0")
    echo "Balance: $BALANCE LIGHTCAT tokens"
    
    # Create backup
    echo ""
    echo "💾 Creating wallet backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/home/lightcat/rgb-node/backups"
    mkdir -p "$BACKUP_DIR"
    
    if rgb-cli wallet export --output "$BACKUP_DIR/wallet_$TIMESTAMP.backup" 2>/dev/null; then
        echo "✅ Backup saved to: $BACKUP_DIR/wallet_$TIMESTAMP.backup"
    fi
else
    echo "❌ Import failed. Please check your seed phrase."
    unset SEED WORDS WORD
    exit 1
fi

# Clear bash history
history -c 2>/dev/null || true
echo ""
echo "✅ Setup complete! Your wallet is ready."
EOF

# Balance check script
cat > /home/lightcat/rgb-node/scripts/check-balance.sh << 'EOF'
#!/bin/bash
echo "💰 LIGHTCAT Token Balance Check"
echo "=============================="
echo ""

ASSET_ID="rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po"

# Check if wallet exists
if ! rgb-cli wallet list 2>/dev/null | grep -q "lightcat-main"; then
    echo "❌ No wallet found. Please import your wallet first."
    echo "   Run: ~/rgb-node/scripts/import-wallet.sh"
    exit 1
fi

# Get balance
BALANCE=$(rgb-cli asset balance "$ASSET_ID" 2>/dev/null || echo "0")

echo "Asset ID: $ASSET_ID"
echo "Balance: $BALANCE LIGHTCAT tokens"
echo ""

# Show formatted balance
if [ "$BALANCE" != "0" ]; then
    FORMATTED=$(echo "$BALANCE" | sed ':a;s/\B[0-9]\{3\}\>/,&/;ta')
    echo "Formatted: $FORMATTED LIGHTCAT"
fi
EOF

# Transfer script
cat > /home/lightcat/rgb-node/scripts/transfer-tokens.sh << 'EOF'
#!/bin/bash

if [ $# -ne 2 ]; then
    echo "Usage: $0 <recipient_invoice> <amount>"
    echo ""
    echo "Example:"
    echo "  $0 \"rgb:~/~/~/bc:utxob:...\" 1000"
    exit 1
fi

RECIPIENT=$1
AMOUNT=$2
ASSET_ID="rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po"

# Validate amount
if ! [[ "$AMOUNT" =~ ^[0-9]+$ ]] || [ "$AMOUNT" -lt 1 ]; then
    echo "❌ Invalid amount. Must be a positive number."
    exit 1
fi

# Check balance first
BALANCE=$(rgb-cli asset balance "$ASSET_ID" 2>/dev/null || echo "0")
if [ "$BALANCE" -lt "$AMOUNT" ]; then
    echo "❌ Insufficient balance. Have: $BALANCE, Need: $AMOUNT"
    exit 1
fi

echo "📤 Transfer Details:"
echo "==================="
echo "Amount: $AMOUNT LIGHTCAT"
echo "To: ${RECIPIENT:0:50}..."
echo ""

read -p "Confirm transfer? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Transfer cancelled."
    exit 0
fi

echo "Processing transfer..."

# Create transfer
RESULT=$(rgb-cli transfer create \
    --asset "$ASSET_ID" \
    --amount "$AMOUNT" \
    --recipient "$RECIPIENT" \
    --fee-rate 5 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ Transfer successful!"
    echo ""
    echo "Consignment: $RESULT"
    
    # Log transfer
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$TIMESTAMP] Transferred $AMOUNT to ${RECIPIENT:0:30}..." >> /home/lightcat/rgb-node/logs/transfers.log
else
    echo "❌ Transfer failed:"
    echo "$RESULT"
    exit 1
fi
EOF

# System status script
cat > /home/lightcat/rgb-node/scripts/check-status.sh << 'EOF'
#!/bin/bash

echo "🔍 LIGHTCAT System Status"
echo "========================"
echo ""

# RGB Node status
echo "RGB Node:"
if systemctl is-active --quiet rgb-node; then
    echo "  ✅ Running"
    echo "  PID: $(pgrep -f rgb-node)"
    echo "  Uptime: $(systemctl show rgb-node --property=ActiveEnterTimestamp | cut -d= -f2-)"
else
    echo "  ❌ Not running"
fi

# Check balance
echo ""
echo "Token Balance:"
BALANCE=$(rgb-cli asset balance rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po 2>/dev/null || echo "Unable to check")
echo "  $BALANCE LIGHTCAT"

# Disk usage
echo ""
echo "Disk Usage:"
df -h /home/lightcat | tail -1 | awk '{print "  Used: "$3" / "$2" ("$5")"}'

# Memory usage
echo ""
echo "Memory Usage:"
free -h | grep Mem | awk '{print "  Used: "$3" / "$2}'

# Recent transfers
echo ""
echo "Recent Transfers:"
if [ -f /home/lightcat/rgb-node/logs/transfers.log ]; then
    tail -3 /home/lightcat/rgb-node/logs/transfers.log | sed 's/^/  /'
else
    echo "  No transfers logged yet"
fi
EOF

# Backup script
cat > /home/lightcat/rgb-node/scripts/backup-wallet.sh << 'EOF'
#!/bin/bash

echo "💾 Creating wallet backup..."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/lightcat/rgb-node/backups"
BACKUP_FILE="$BACKUP_DIR/wallet_$TIMESTAMP.backup"

mkdir -p "$BACKUP_DIR"

if rgb-cli wallet export --output "$BACKUP_FILE" 2>/dev/null; then
    chmod 600 "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
    
    # Keep only last 10 backups
    ls -t "$BACKUP_DIR"/wallet_*.backup | tail -n +11 | xargs -r rm
    echo "   (Keeping last 10 backups)"
else
    echo "❌ Backup failed"
    exit 1
fi
EOF

# Make all scripts executable
chmod +x /home/lightcat/rgb-node/scripts/*.sh
chown -R lightcat:lightcat /home/lightcat/rgb-node/

# Step 10: Configure firewall
echo -e "\n${BLUE}🔒 Configuring firewall...${NC}"
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 3001/tcp comment 'LIGHTCAT API'
ufw --force enable

# Step 11: Configure Nginx
echo -e "\n${BLUE}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/lightcat << 'EOF'
server {
    listen 80;
    server_name srv890142.hstgr.cloud 147.93.105.138;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # RGB API endpoints
    location /api/rgb/ {
        proxy_pass http://localhost:3001/api/rgb/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Allow larger payloads for consignments
        client_max_body_size 10M;
    }
}
EOF

ln -sf /etc/nginx/sites-available/lightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Step 12: Create website setup script
cat > /home/lightcat/setup-website.sh << 'EOF'
#!/bin/bash

echo "🌐 LIGHTCAT Website Setup"
echo "========================"
echo ""

# Check if repository exists
if [ -d ~/litecat-website ]; then
    echo "Website directory already exists."
    read -p "Remove and re-clone? (yes/no): " CONFIRM
    if [ "$CONFIRM" = "yes" ]; then
        rm -rf ~/litecat-website
    else
        cd ~/litecat-website
        echo "Using existing directory."
    fi
fi

# Clone repository
if [ ! -d ~/litecat-website ]; then
    echo "Please enter your Git repository URL:"
    echo "(Leave empty to skip website setup)"
    read -p "Repository URL: " REPO_URL
    
    if [ -n "$REPO_URL" ]; then
        cd ~
        git clone "$REPO_URL" litecat-website
        cd litecat-website
    else
        echo "Skipping website setup."
        exit 0
    fi
fi

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Create environment file
if [ ! -f .env ]; then
    echo "Creating .env configuration..."
    cat > .env << ENV
# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# URLs
PUBLIC_URL=https://srv890142.hstgr.cloud
API_URL=https://srv890142.hstgr.cloud

# RGB Configuration
USE_MOCK_RGB=false
RGB_NODE_PATH=/home/lightcat/rgb-node
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
RGB_NETWORK=mainnet

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Lightning Configuration
LIGHTNING_NODE_URL=your-voltage-node-url
LIGHTNING_MACAROON=your-macaroon-here

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Monitoring
LOG_LEVEL=info
ENV

    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your actual values:"
    echo "   nano ~/litecat-website/.env"
fi

# Build the application
echo "Building application..."
npm run build 2>/dev/null || echo "No build script found"

# Setup PM2
echo "Setting up PM2 process manager..."
pm2 delete all 2>/dev/null || true

# Start the main server
pm2 start server/server.js --name lightcat-api --env production

# Start WebSocket server if it exists
if [ -f server/websocket-server.js ]; then
    pm2 start server/websocket-server.js --name lightcat-ws --env production
fi

# Save PM2 configuration
pm2 save
pm2 startup systemd -u lightcat --hp /home/lightcat | grep sudo | bash

echo ""
echo "✅ Website setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit configuration: nano ~/litecat-website/.env"
echo "2. Restart services: pm2 restart all"
echo "3. View logs: pm2 logs"
EOF

chown lightcat:lightcat /home/lightcat/setup-website.sh
chmod +x /home/lightcat/setup-website.sh

# Step 13: Create SSL setup script
cat > /home/lightcat/setup-ssl.sh << 'EOF'
#!/bin/bash

echo "🔒 SSL Certificate Setup"
echo "======================="
echo ""

DOMAIN="srv890142.hstgr.cloud"

echo "Setting up SSL for: $DOMAIN"
echo ""

# Install certificate
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate installed!"
    echo ""
    echo "Your site is now available at:"
    echo "  https://$DOMAIN"
    
    # Setup auto-renewal
    echo ""
    echo "Setting up auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 0,12 * * * /usr/bin/certbot renew --quiet") | crontab -
    echo "✅ Auto-renewal configured"
else
    echo "❌ SSL setup failed"
    echo "You can try again later with: sudo certbot --nginx"
fi
EOF

chown lightcat:lightcat /home/lightcat/setup-ssl.sh
chmod +x /home/lightcat/setup-ssl.sh

# Step 14: Create monitoring script
cat > /home/lightcat/monitor.sh << 'EOF'
#!/bin/bash

# Simple monitoring script
while true; do
    clear
    echo "🔍 LIGHTCAT Live Monitor - $(date)"
    echo "=================================="
    echo ""
    
    # RGB Node
    echo "RGB Node Status:"
    if systemctl is-active --quiet rgb-node; then
        echo "  ✅ Running"
    else
        echo "  ❌ Stopped"
    fi
    
    # Website
    echo ""
    echo "Website Status:"
    pm2 list --no-color | grep -E "lightcat|online|stopped" || echo "  No PM2 processes"
    
    # System resources
    echo ""
    echo "System Resources:"
    echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "  Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
    echo "  Disk: $(df -h / | awk 'NR==2{print $5}')"
    
    # Recent logs
    echo ""
    echo "Recent RGB Logs:"
    tail -3 /home/lightcat/rgb-node/logs/rgb-node.log 2>/dev/null | sed 's/^/  /' || echo "  No logs yet"
    
    echo ""
    echo "Press Ctrl+C to exit"
    sleep 5
done
EOF

chown lightcat:lightcat /home/lightcat/monitor.sh
chmod +x /home/lightcat/monitor.sh

# Create final summary
cat > /root/lightcat-setup-complete.txt << EOF
🎉 LIGHTCAT RGB Node Setup Complete!
===================================

Server Details:
- IP: 147.93.105.138
- Hostname: srv890142.hstgr.cloud
- User: lightcat
- RGB Node: Installed and ready

Next Steps:
1. Switch to lightcat user:
   su - lightcat

2. Import your wallet:
   cd ~/rgb-node/scripts
   ./import-wallet.sh

3. Start RGB node:
   sudo systemctl start rgb-node

4. Check balance:
   ./check-balance.sh

5. Setup website (optional):
   cd ~
   ./setup-website.sh

6. Setup SSL certificate:
   ./setup-ssl.sh

Helper Scripts:
- ~/rgb-node/scripts/import-wallet.sh - Import seed phrase
- ~/rgb-node/scripts/check-balance.sh - Check token balance
- ~/rgb-node/scripts/transfer-tokens.sh - Manual transfers
- ~/rgb-node/scripts/check-status.sh - System status
- ~/rgb-node/scripts/backup-wallet.sh - Backup wallet
- ~/monitor.sh - Live monitoring

Important Paths:
- RGB Config: /home/lightcat/rgb-node/config/
- RGB Logs: /home/lightcat/rgb-node/logs/
- Website: /home/lightcat/litecat-website/
- Nginx: /etc/nginx/sites-available/lightcat

Security Notes:
✓ Firewall enabled (ports 22, 80, 443, 3001)
✓ Non-root user created (lightcat)
✓ Systemd service configured
✓ Nginx reverse proxy ready

Your Mumbai VPS is ready for LIGHTCAT! 🚀
EOF

# Final message
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}================${NC}"
echo ""
echo "Setup summary saved to: /root/lightcat-setup-complete.txt"
echo ""
echo -e "${YELLOW}IMPORTANT - Next Steps:${NC}"
echo ""
echo "1. Switch to lightcat user:"
echo -e "   ${BLUE}su - lightcat${NC}"
echo ""
echo "2. Import your wallet (have seed phrase ready):"
echo -e "   ${BLUE}cd ~/rgb-node/scripts && ./import-wallet.sh${NC}"
echo ""
echo "3. Start RGB node:"
echo -e "   ${BLUE}sudo systemctl start rgb-node${NC}"
echo ""
echo "4. Check everything is working:"
echo -e "   ${BLUE}./check-status.sh${NC}"
echo ""
echo "Your server IP: ${GREEN}147.93.105.138${NC}"
echo "Your hostname: ${GREEN}srv890142.hstgr.cloud${NC}"
echo ""
echo "Thank you for using LIGHTCAT! 🚀"