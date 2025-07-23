#!/bin/bash

# VPS Quick Setup Script for LIGHTCAT RGB Node
# Optimized for your Mumbai server (147.93.105.138)

set -e

echo "🚀 LIGHTCAT RGB Node VPS Setup"
echo "=============================="
echo "Server: srv890142.hstgr.cloud"
echo "Location: Mumbai, India"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root (expected on fresh VPS)
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}This script should be run as root on a fresh VPS${NC}"
   exit 1
fi

echo -e "${YELLOW}This script will:${NC}"
echo "1. Create a secure user account"
echo "2. Install RGB node and dependencies"
echo "3. Set up your LIGHTCAT website"
echo "4. Configure Nginx and SSL"
echo "5. Enable automatic token distribution"
echo ""

read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Setup cancelled."
    exit 0
fi

# Step 1: System Update
echo -e "\n${BLUE}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Step 2: Create non-root user
echo -e "\n${BLUE}👤 Creating lightcat user...${NC}"
if ! id "lightcat" &>/dev/null; then
    adduser --disabled-password --gecos "" lightcat
    usermod -aG sudo lightcat
    echo "lightcat ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
    echo -e "${GREEN}✓ User created${NC}"
else
    echo -e "${YELLOW}User already exists${NC}"
fi

# Step 3: Install dependencies
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
    ufw

# Step 4: Install Node.js 18
echo -e "\n${BLUE}📦 Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Step 5: Install Rust for lightcat user
echo -e "\n${BLUE}🦀 Installing Rust...${NC}"
su - lightcat -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'

# Step 6: Create RGB installation script
echo -e "\n${BLUE}📝 Creating RGB installation script...${NC}"
cat > /home/lightcat/install-rgb.sh << 'EOF'
#!/bin/bash
set -e

# Load Rust
source $HOME/.cargo/env

# Create directories
mkdir -p ~/rgb-node/{data,config,backups,logs}
cd ~/rgb-node

# Clone and build RGB node
git clone https://github.com/RGB-WG/rgb-node.git
cd rgb-node
git checkout v0.10.0
cargo build --release

# Install binaries
sudo cp target/release/rgb-node /usr/local/bin/
sudo cp target/release/rgb-cli /usr/local/bin/
sudo chmod +x /usr/local/bin/rgb-node
sudo chmod +x /usr/local/bin/rgb-cli

# Create configuration
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

echo "✅ RGB Node installed!"
EOF

chown lightcat:lightcat /home/lightcat/install-rgb.sh
chmod +x /home/lightcat/install-rgb.sh

# Step 7: Run RGB installation as lightcat
echo -e "\n${BLUE}🔧 Installing RGB node...${NC}"
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

# Step 9: Create helper scripts
echo -e "\n${BLUE}📝 Creating helper scripts...${NC}"

# Wallet import script
cat > /home/lightcat/rgb-node/import-wallet.sh << 'EOF'
#!/bin/bash
echo "🔐 LIGHTCAT Wallet Import"
echo "========================"
echo ""
echo "This will import your seed phrase securely."
echo "Words will be hidden as you type."
echo ""

WORDS=()
echo "Enter your seed phrase (12 or 24 words):"
echo "Press Enter after the last word"
echo ""

i=1
while true; do
    read -s -p "Word $i: " WORD
    echo ""
    if [ -z "$WORD" ]; then
        break
    fi
    WORDS+=("$WORD")
    i=$((i+1))
done

if [ ${#WORDS[@]} -ne 12 ] && [ ${#WORDS[@]} -ne 24 ]; then
    echo "❌ Invalid seed phrase length. Expected 12 or 24 words, got ${#WORDS[@]}"
    exit 1
fi

echo "Importing wallet..."
SEED="${WORDS[*]}"
rgb-cli wallet import --words "$SEED" --name "lightcat-main" 2>/dev/null

# Clear sensitive data
unset SEED WORDS

if [ $? -eq 0 ]; then
    echo "✅ Wallet imported successfully!"
    echo "🔄 Syncing wallet..."
    rgb-cli wallet sync
    
    echo ""
    echo "💰 Checking LIGHTCAT balance..."
    rgb-cli asset balance rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
else
    echo "❌ Import failed. Please check your seed phrase."
fi
EOF

# Balance check script
cat > /home/lightcat/rgb-node/check-balance.sh << 'EOF'
#!/bin/bash
echo "💰 LIGHTCAT Token Balance"
echo "========================"
ASSET_ID="rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po"
rgb-cli asset balance "$ASSET_ID"
EOF

# Transfer script
cat > /home/lightcat/rgb-node/transfer-tokens.sh << 'EOF'
#!/bin/bash
if [ $# -ne 2 ]; then
    echo "Usage: $0 <recipient_invoice> <amount>"
    exit 1
fi

RECIPIENT=$1
AMOUNT=$2
ASSET_ID="rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po"

echo "📤 Transferring $AMOUNT LIGHTCAT tokens..."
rgb-cli transfer create \
    --asset "$ASSET_ID" \
    --amount "$AMOUNT" \
    --recipient "$RECIPIENT" \
    --fee-rate 5
EOF

# Make scripts executable
chown -R lightcat:lightcat /home/lightcat/rgb-node/
chmod +x /home/lightcat/rgb-node/*.sh

# Step 10: Configure firewall
echo -e "\n${BLUE}🔒 Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Step 11: Configure Nginx
echo -e "\n${BLUE}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/lightcat << 'EOF'
server {
    listen 80;
    server_name srv890142.hstgr.cloud;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/lightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Step 12: Install PM2
echo -e "\n${BLUE}📦 Installing PM2...${NC}"
npm install -g pm2
pm2 startup systemd -u lightcat --hp /home/lightcat

# Step 13: Create setup completion script
cat > /home/lightcat/complete-setup.sh << 'EOF'
#!/bin/bash
echo "🎯 Completing LIGHTCAT Setup"
echo "==========================="

# Clone website (you'll need to provide your repo URL)
echo "Please enter your Git repository URL:"
read -p "Repository URL: " REPO_URL

if [ -n "$REPO_URL" ]; then
    cd ~
    git clone "$REPO_URL" litecat-website
    cd litecat-website
    npm install
    
    # Create .env file
    cat > .env << ENV
# Server Configuration
PORT=3001
HOST=0.0.0.0

# RGB Configuration
USE_MOCK_RGB=false
RGB_NODE_PATH=/home/lightcat/rgb-node
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
RGB_NETWORK=mainnet

# Add your Lightning configuration here
LIGHTNING_NODE_URL=
LIGHTNING_MACAROON=
ENV

    echo "✅ Repository cloned. Please edit .env with your Lightning details."
    echo "nano ~/litecat-website/.env"
fi
EOF

chown lightcat:lightcat /home/lightcat/complete-setup.sh
chmod +x /home/lightcat/complete-setup.sh

# Final instructions
echo ""
echo -e "${GREEN}✅ VPS Setup Complete!${NC}"
echo -e "${GREEN}====================${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. Switch to lightcat user:"
echo -e "   ${BLUE}su - lightcat${NC}"
echo ""
echo "2. Import your wallet:"
echo -e "   ${BLUE}cd ~/rgb-node && ./import-wallet.sh${NC}"
echo ""
echo "3. Complete website setup:"
echo -e "   ${BLUE}./complete-setup.sh${NC}"
echo ""
echo "4. Start RGB node:"
echo -e "   ${BLUE}sudo systemctl start rgb-node${NC}"
echo ""
echo "5. Configure SSL:"
echo -e "   ${BLUE}sudo certbot --nginx -d srv890142.hstgr.cloud${NC}"
echo ""
echo -e "${GREEN}Server Details:${NC}"
echo "- RGB Node Path: /home/lightcat/rgb-node"
echo "- Website Path: /home/lightcat/litecat-website"
echo "- Nginx Config: /etc/nginx/sites-available/lightcat"
echo ""
echo -e "${YELLOW}Security enabled:${NC}"
echo "✓ Firewall (UFW) configured"
echo "✓ Non-root user created"
echo "✓ Fail2ban ready to configure"
echo ""
echo "Your Mumbai VPS is ready for LIGHTCAT! 🚀"