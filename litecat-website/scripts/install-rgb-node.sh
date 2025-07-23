#!/bin/bash

# RGB Node Installation Script for LIGHTCAT Token Automation
# This script installs RGB node and prepares it for automated token distribution

set -e

echo "🚀 RGB Node Installation for LIGHTCAT"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root. Run as regular user with sudo access.${NC}"
   exit 1
fi

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 successful${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y
check_success "System update"

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    libzmq3-dev \
    git \
    curl \
    jq \
    screen
check_success "Dependencies installation"

# Install Rust if not present
if ! command -v cargo &> /dev/null; then
    echo "🦀 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    check_success "Rust installation"
else
    echo "✓ Rust already installed"
fi

# Create RGB directory
echo "📁 Creating RGB directories..."
mkdir -p ~/rgb-node/{data,config,backups,logs}
check_success "Directory creation"

# Install RGB Node
echo "🔧 Installing RGB Node..."
cd ~/rgb-node

# Clone and build RGB node
git clone https://github.com/RGB-WG/rgb-node.git
cd rgb-node
git checkout v0.10.0  # Use stable version
cargo build --release
check_success "RGB node build"

# Install binaries
echo "📦 Installing RGB binaries..."
sudo cp target/release/rgb-node /usr/local/bin/
sudo cp target/release/rgb-cli /usr/local/bin/
sudo chmod +x /usr/local/bin/rgb-node
sudo chmod +x /usr/local/bin/rgb-cli
check_success "Binary installation"

# Create configuration file
echo "⚙️ Creating configuration..."
cat > ~/rgb-node/config/rgb-node.conf << EOF
# RGB Node Configuration for LIGHTCAT
network = "mainnet"
data_dir = "$HOME/rgb-node/data"
rpc_port = 50001
rpc_host = "127.0.0.1"

# Electrum server (you can change this to your preferred server)
electrum_server = "electrum.blockstream.info:50002"

# Logging
log_level = "info"
log_file = "$HOME/rgb-node/logs/rgb-node.log"

# Security
rpc_auth = true
rpc_user = "rgbuser"
rpc_password = "$(openssl rand -base64 32)"

# Performance
max_connections = 50
cache_size = 1000
EOF
check_success "Configuration creation"

# Create systemd service
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/rgb-node.service > /dev/null << EOF
[Unit]
Description=RGB Node for LIGHTCAT Token
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/rgb-node --config $HOME/rgb-node/config/rgb-node.conf
Restart=always
RestartSec=10
StandardOutput=append:$HOME/rgb-node/logs/rgb-node.log
StandardError=append:$HOME/rgb-node/logs/rgb-node-error.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
check_success "Systemd service creation"

# Create helper scripts
echo "📝 Creating helper scripts..."

# Wallet import script
cat > ~/rgb-node/import-wallet.sh << 'EOF'
#!/bin/bash

echo "🔐 RGB Wallet Import Tool"
echo "========================"
echo ""
echo "⚠️  SECURITY WARNING:"
echo "- Run this script only on a secure server"
echo "- Make sure no one can see your screen"
echo "- The seed phrase will not be displayed after import"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."

# Get seed phrase securely
echo "Enter your 12 or 24 word seed phrase:"
read -s -p "Seed phrase: " SEED_PHRASE
echo ""

# Import wallet
rgb-cli wallet import --words "$SEED_PHRASE" --name "lightcat-main"

# Clear seed from memory
unset SEED_PHRASE

echo ""
echo "✅ Wallet imported successfully!"
echo "🔄 Syncing wallet..."

rgb-cli wallet sync

echo ""
echo "📊 Checking LIGHTCAT balance..."
rgb-cli asset balance rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po

echo ""
echo "✅ Setup complete!"
EOF
chmod +x ~/rgb-node/import-wallet.sh

# Create transfer script
cat > ~/rgb-node/transfer-tokens.sh << 'EOF'
#!/bin/bash

# LIGHTCAT Token Transfer Script
# Usage: ./transfer-tokens.sh <recipient_invoice> <amount>

RECIPIENT=$1
AMOUNT=$2
ASSET_ID="rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po"

if [ -z "$RECIPIENT" ] || [ -z "$AMOUNT" ]; then
    echo "Usage: $0 <recipient_invoice> <amount>"
    exit 1
fi

echo "📤 Transferring $AMOUNT LIGHTCAT tokens..."

# Create transfer
CONSIGNMENT=$(rgb-cli transfer create \
    --asset "$ASSET_ID" \
    --amount "$AMOUNT" \
    --recipient "$RECIPIENT" \
    --fee-rate 5)

if [ $? -eq 0 ]; then
    echo "✅ Transfer successful!"
    echo "📦 Consignment: $CONSIGNMENT"
else
    echo "❌ Transfer failed!"
    exit 1
fi
EOF
chmod +x ~/rgb-node/transfer-tokens.sh

# Create balance check script
cat > ~/rgb-node/check-balance.sh << 'EOF'
#!/bin/bash

echo "💰 LIGHTCAT Token Balance"
echo "========================"

ASSET_ID="rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po"

rgb-cli asset balance "$ASSET_ID"
EOF
chmod +x ~/rgb-node/check-balance.sh

check_success "Helper scripts creation"

# Create Node.js automation service
echo "🤖 Creating automation service..."
cat > ~/rgb-node/rgb-automation-service.js << 'EOF'
const { exec } = require('child_process');
const express = require('express');
const app = express();

// Configuration
const ASSET_ID = 'rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po';
const PORT = 50002;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'rgb-automation' });
});

// Get balance
app.get('/balance', async (req, res) => {
    exec(`rgb-cli asset balance ${ASSET_ID}`, (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }
        res.json({ balance: stdout.trim() });
    });
});

// Transfer tokens
app.post('/transfer', async (req, res) => {
    const { recipient, amount } = req.body;
    
    if (!recipient || !amount) {
        res.status(400).json({ error: 'Missing recipient or amount' });
        return;
    }
    
    const command = `rgb-cli transfer create --asset ${ASSET_ID} --amount ${amount} --recipient "${recipient}" --fee-rate 5`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }
        res.json({ 
            success: true, 
            consignment: stdout.trim(),
            amount: amount,
            recipient: recipient
        });
    });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`RGB Automation Service running on port ${PORT}`);
});
EOF

check_success "Automation service creation"

# Final instructions
echo ""
echo "✅ RGB Node Installation Complete!"
echo "=================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Import your wallet:"
echo "   ${GREEN}cd ~/rgb-node && ./import-wallet.sh${NC}"
echo ""
echo "2. Start RGB node:"
echo "   ${GREEN}sudo systemctl start rgb-node${NC}"
echo "   ${GREEN}sudo systemctl enable rgb-node${NC}"
echo ""
echo "3. Check node status:"
echo "   ${GREEN}sudo systemctl status rgb-node${NC}"
echo ""
echo "4. Check logs:"
echo "   ${GREEN}tail -f ~/rgb-node/logs/rgb-node.log${NC}"
echo ""
echo "5. Test balance check:"
echo "   ${GREEN}~/rgb-node/check-balance.sh${NC}"
echo ""
echo "⚠️  IMPORTANT:"
echo "- Keep your seed phrase secure"
echo "- Backup ~/rgb-node/config regularly"
echo "- Monitor logs for any issues"
echo ""
echo "📦 Installed components:"
echo "- RGB Node: /usr/local/bin/rgb-node"
echo "- RGB CLI: /usr/local/bin/rgb-cli"
echo "- Config: ~/rgb-node/config/"
echo "- Scripts: ~/rgb-node/*.sh"
echo ""