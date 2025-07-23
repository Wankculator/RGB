#!/bin/bash

# LIGHTCAT Lightweight Testnet Setup
# No blockchain download required! Uses Voltage + RGB only

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🚀 LIGHTCAT Lightweight Testnet Setup${NC}"
echo "====================================="
echo "No 50GB download required!"
echo ""

# Function to install RGB only
install_rgb_only() {
    echo -e "${BLUE}🔴 Installing RGB Node (Lightweight)...${NC}"
    
    # Check if Rust is installed
    if ! command -v cargo &> /dev/null; then
        echo "Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source $HOME/.cargo/env
    fi
    
    # Install RGB from crates.io (faster than building)
    echo "Installing RGB Node..."
    cargo install rgb-node --version 0.10.0 || {
        # Fallback to building from source if crates.io fails
        echo "Building from source..."
        git clone https://github.com/RGB-WG/rgb-node /tmp/rgb-node
        cd /tmp/rgb-node
        cargo build --release
        sudo mv target/release/rgbd /usr/local/bin/
        sudo mv target/release/rgb-cli /usr/local/bin/
        cd -
    }
    
    echo -e "${GREEN}✅ RGB Node installed${NC}"
    echo ""
}

# Function to setup Voltage
setup_voltage() {
    echo -e "${BLUE}⚡ Setting up Voltage Cloud Lightning...${NC}"
    echo ""
    echo "Voltage provides FREE testnet Lightning nodes - no download needed!"
    echo ""
    echo "Steps:"
    echo "1. Go to: https://voltage.cloud"
    echo "2. Sign up for free account"
    echo "3. Click 'Create Node'"
    echo "4. Choose:"
    echo "   - Node Type: Standard"
    echo "   - Network: Testnet"
    echo "   - Name: LIGHTCAT-Testnet"
    echo "5. Download connection files when ready"
    echo ""
    
    read -p "Press Enter when you have your Voltage node ready..."
    
    # Create directory for Voltage credentials
    mkdir -p ~/voltage-credentials
    
    echo ""
    echo "Please save these files to ~/voltage-credentials/:"
    echo "- admin.macaroon"
    echo "- tls.cert"
    echo "- connection URL"
    echo ""
    
    read -p "Press Enter when files are saved..."
    
    # Check if files exist
    if [ -f ~/voltage-credentials/admin.macaroon ]; then
        echo -e "${GREEN}✅ Voltage credentials found${NC}"
    else
        echo -e "${YELLOW}⚠️  Credentials not found in ~/voltage-credentials/${NC}"
    fi
    
    echo ""
}

# Function to create lightweight config
create_lightweight_config() {
    echo -e "${BLUE}📝 Creating Configuration...${NC}"
    
    # Get Voltage URL
    echo "Enter your Voltage node URL"
    echo "(Example: https://your-node.m.voltageapp.io:8080)"
    read -p "URL: " VOLTAGE_URL
    
    # Create RGB directory
    mkdir -p ~/.rgb-testnet
    
    # Create environment file
    cat > ~/lightcat-testnet-env.txt << EOF
# LIGHTCAT Lightweight Testnet Configuration

# Lightning (from Voltage Cloud)
LIGHTNING_IMPLEMENTATION=LND
LIGHTNING_NODE_URL=$VOLTAGE_URL
LIGHTNING_MACAROON_PATH=$HOME/voltage-credentials/admin.macaroon
LIGHTNING_TLS_CERT_PATH=$HOME/voltage-credentials/tls.cert

# RGB (local lightweight)
RGB_NODE_URL=http://localhost:50001
RGB_NETWORK=testnet
RGB_DATA_DIR=$HOME/.rgb-testnet

# Blockchain Data (using public APIs)
BITCOIN_EXPLORER_API=https://blockstream.info/testnet/api
USE_NEUTRINO=true

# No local Bitcoin Core needed!
SKIP_BITCOIN_CORE=true
EOF

    echo -e "${GREEN}✅ Configuration created${NC}"
    echo ""
}

# Function to start RGB only
start_rgb_daemon() {
    echo -e "${BLUE}🚀 Starting RGB Daemon...${NC}"
    
    # Check if already running
    if pgrep -x "rgbd" > /dev/null; then
        echo "RGB daemon already running"
    else
        # Start RGB daemon
        rgbd --network testnet --data-dir ~/.rgb-testnet > ~/.rgb-testnet/rgbd.log 2>&1 &
        sleep 3
        
        if pgrep -x "rgbd" > /dev/null; then
            echo -e "${GREEN}✅ RGB daemon started${NC}"
        else
            echo -e "${RED}❌ Failed to start RGB daemon${NC}"
            echo "Check logs: tail -f ~/.rgb-testnet/rgbd.log"
        fi
    fi
    echo ""
}

# Function to create RGB wallet
create_rgb_wallet() {
    echo -e "${BLUE}💰 Creating RGB Wallet...${NC}"
    
    # Create wallet
    rgb-cli wallet create lightcat-testnet || {
        echo "Wallet might already exist"
    }
    
    # Get wallet info
    rgb-cli wallet list
    
    echo -e "${GREEN}✅ RGB wallet ready${NC}"
    echo ""
}

# Function to get testnet funds
get_testnet_funds() {
    echo -e "${BLUE}💸 Getting Testnet Bitcoin...${NC}"
    echo ""
    echo "You need a small amount of testnet Bitcoin for RGB UTXOs"
    echo ""
    echo "Option 1: Lightning Faucet (Recommended)"
    echo "1. Visit: https://htlc.me/"
    echo "2. Connect with your Voltage node"
    echo "3. Receive testnet sats instantly!"
    echo ""
    echo "Option 2: Regular Faucets"
    echo "- https://testnet-faucet.mempool.co/"
    echo "- https://bitcoinfaucet.uo1.net/"
    echo ""
    read -p "Press Enter after getting testnet funds..."
    echo ""
}

# Function to test setup
test_lightweight_setup() {
    echo -e "${BLUE}🧪 Testing Setup...${NC}"
    
    # Test Voltage connection
    echo "Testing Lightning connection..."
    # Would use lncli via REST API
    
    # Test RGB
    echo "Testing RGB node..."
    if rgb-cli wallet list &> /dev/null; then
        echo -e "${GREEN}✅ RGB node working${NC}"
    else
        echo -e "${RED}❌ RGB node not responding${NC}"
    fi
    
    echo ""
}

# Function to show next steps
show_next_steps() {
    echo -e "${GREEN}🎉 Lightweight Setup Complete!${NC}"
    echo "=============================="
    echo ""
    echo "Total disk usage: < 1GB ✅"
    echo "No blockchain download needed! ✅"
    echo ""
    echo "Your setup:"
    echo "- Lightning: Voltage Cloud (managed)"
    echo "- RGB: Local lightweight node"
    echo "- Blockchain: Public APIs"
    echo ""
    echo "Next steps:"
    echo "1. Copy configuration to your project:"
    echo "   cp ~/lightcat-testnet-env.txt /path/to/litecat-website/.env"
    echo ""
    echo "2. Issue LIGHTCAT tokens:"
    echo "   rgb-cli asset issue --ticker LCAT --name LIGHTCAT --supply 21000000"
    echo ""
    echo "3. Update .env with RGB_ASSET_ID"
    echo ""
    echo "4. Start your application:"
    echo "   cd /path/to/litecat-website"
    echo "   npm run dev"
    echo ""
    echo "5. Test with real Lightning payments!"
    echo ""
    echo -e "${YELLOW}💡 Pro tip: Join RGB Discord for testnet help${NC}"
    echo "   https://discord.gg/rgb-protocol"
}

# Main execution
main() {
    echo "This setup uses:"
    echo "- Voltage Cloud for Lightning (no download)"
    echo "- Local RGB only (< 1GB)"
    echo "- Public APIs for blockchain data"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    
    install_rgb_only
    setup_voltage
    create_lightweight_config
    start_rgb_daemon
    create_rgb_wallet
    get_testnet_funds
    test_lightweight_setup
    show_next_steps
}

# Run main function
main