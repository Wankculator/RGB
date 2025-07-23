#!/bin/bash

# LIGHTCAT Testnet Setup Script
# Following CLAUDE.md excellence standards
# Start with testnet for safety before mainnet

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔴 LIGHTCAT RGB Protocol Testnet Setup${NC}"
echo "========================================="
echo ""

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}❌ This script should not be run as root${NC}"
        echo "Please run as regular user with sudo privileges"
        exit 1
    fi
}

# Function to create testnet directories
create_testnet_dirs() {
    echo -e "${BLUE}📁 Creating Testnet Directories...${NC}"
    
    mkdir -p ~/lightcat-testnet/{bitcoin,lightning,rgb,wallets,backups,logs}
    mkdir -p ~/lightcat-testnet/lightning/{lnd,data}
    mkdir -p ~/lightcat-testnet/rgb/{data,wallets}
    
    echo -e "${GREEN}✅ Testnet directories created${NC}"
    echo ""
}

# Function to install Bitcoin Core (testnet)
install_bitcoin_testnet() {
    echo -e "${BLUE}🔶 Installing Bitcoin Core (Testnet)...${NC}"
    
    if ! command -v bitcoind &> /dev/null; then
        # Download Bitcoin Core
        cd /tmp
        wget https://bitcoin.org/bin/bitcoin-core-25.0/bitcoin-25.0-x86_64-linux-gnu.tar.gz
        tar -xzf bitcoin-25.0-x86_64-linux-gnu.tar.gz
        sudo mv bitcoin-25.0/bin/* /usr/local/bin/
        rm -rf bitcoin-25.0*
    fi
    
    # Create Bitcoin testnet config
    cat > ~/lightcat-testnet/bitcoin/bitcoin.conf << EOF
# Bitcoin Core Testnet Configuration
testnet=1
server=1
daemon=1
txindex=1

# RPC Settings
rpcuser=lightcat
rpcpassword=$(openssl rand -hex 32)
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
rpcport=18332

# Network
listen=1
port=18333
maxconnections=125

# Performance
dbcache=4096
maxmempool=300
maxuploadtarget=1000

# Pruning (optional, saves space)
#prune=10000

# ZMQ for Lightning
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28333
EOF

    echo -e "${GREEN}✅ Bitcoin Core configured for testnet${NC}"
    echo ""
}

# Function to install LND (testnet)
install_lnd_testnet() {
    echo -e "${BLUE}⚡ Installing LND (Testnet)...${NC}"
    
    if ! command -v lnd &> /dev/null; then
        # Download LND
        cd /tmp
        wget https://github.com/lightningnetwork/lnd/releases/download/v0.17.3-beta/lnd-linux-amd64-v0.17.3-beta.tar.gz
        tar -xzf lnd-linux-amd64-v0.17.3-beta.tar.gz
        sudo mv lnd-linux-amd64-v0.17.3-beta/lnd /usr/local/bin/
        sudo mv lnd-linux-amd64-v0.17.3-beta/lncli /usr/local/bin/
        rm -rf lnd-linux-amd64*
    fi
    
    # Create LND testnet config
    cat > ~/lightcat-testnet/lightning/lnd/lnd.conf << EOF
[Application Options]
alias=LIGHTCAT-TESTNET
color=#FFFF00
debuglevel=info
maxpendingchannels=10
listen=localhost:9735
rpclisten=localhost:10009
restlisten=localhost:8080

[Bitcoin]
bitcoin.active=true
bitcoin.testnet=true
bitcoin.node=bitcoind

[Bitcoind]
bitcoind.rpcuser=lightcat
bitcoind.rpcpass=$(grep rpcpassword ~/lightcat-testnet/bitcoin/bitcoin.conf | cut -d= -f2)
bitcoind.rpchost=localhost:18332
bitcoind.zmqpubrawblock=tcp://127.0.0.1:28332
bitcoind.zmqpubrawtx=tcp://127.0.0.1:28333

[protocol]
protocol.wumbo-channels=true

[wtclient]
wtclient.active=true
EOF

    echo -e "${GREEN}✅ LND configured for testnet${NC}"
    echo ""
}

# Function to install RGB Node
install_rgb_node() {
    echo -e "${BLUE}🔴 Installing RGB Node...${NC}"
    
    # Check if Rust is installed
    if ! command -v cargo &> /dev/null; then
        echo "Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source $HOME/.cargo/env
    fi
    
    # Clone and build RGB node
    cd ~/lightcat-testnet/rgb
    if [ ! -d "rgb-node" ]; then
        git clone https://github.com/RGB-WG/rgb-node
        cd rgb-node
        cargo build --release
        sudo mv target/release/rgbd /usr/local/bin/
        sudo mv target/release/rgb-cli /usr/local/bin/
    fi
    
    echo -e "${GREEN}✅ RGB Node installed${NC}"
    echo ""
}

# Function to create systemd services
create_systemd_services() {
    echo -e "${BLUE}🔧 Creating Systemd Services...${NC}"
    
    # Bitcoin service
    sudo tee /etc/systemd/system/bitcoind-testnet.service > /dev/null << EOF
[Unit]
Description=Bitcoin Core Testnet
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/bitcoind -conf=$HOME/lightcat-testnet/bitcoin/bitcoin.conf -datadir=$HOME/lightcat-testnet/bitcoin
User=$USER
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

    # LND service
    sudo tee /etc/systemd/system/lnd-testnet.service > /dev/null << EOF
[Unit]
Description=LND Lightning Network Testnet
Requires=bitcoind-testnet.service
After=bitcoind-testnet.service

[Service]
Type=simple
ExecStart=/usr/local/bin/lnd --lnddir=$HOME/lightcat-testnet/lightning/lnd
User=$USER
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

    # RGB service
    sudo tee /etc/systemd/system/rgb-testnet.service > /dev/null << EOF
[Unit]
Description=RGB Node Testnet
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/rgbd --network testnet --data-dir $HOME/lightcat-testnet/rgb/data
User=$USER
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    echo -e "${GREEN}✅ Systemd services created${NC}"
    echo ""
}

# Function to generate testnet wallet
setup_testnet_wallet() {
    echo -e "${BLUE}💰 Setting up Testnet Wallet...${NC}"
    
    # Create setup script for after services start
    cat > ~/lightcat-testnet/setup-wallet.sh << 'EOF'
#!/bin/bash

echo "Waiting for services to start..."
sleep 10

# Create LND wallet
echo "Creating LND wallet..."
lncli --network=testnet create

# Get new address
echo "Getting testnet address..."
ADDR=$(lncli --network=testnet newaddress p2wkh | jq -r '.address')
echo "Your testnet address: $ADDR"
echo ""
echo "Get testnet Bitcoin from: https://testnet-faucet.mempool.co/"
echo ""

# Create RGB wallet
echo "Creating RGB wallet..."
rgb-cli wallet create lightcat-testnet

# Wait for user to fund wallet
echo "After funding, press Enter to continue..."
read

# Issue LIGHTCAT tokens on testnet
echo "Issuing LIGHTCAT testnet tokens..."
rgb-cli asset issue \
  --ticker "LCAT" \
  --name "LIGHTCAT-TESTNET" \
  --description "LIGHTCAT testnet tokens" \
  --supply 21000000 \
  --precision 0 \
  --wallet lightcat-testnet

echo "Setup complete!"
EOF

    chmod +x ~/lightcat-testnet/setup-wallet.sh
    echo -e "${GREEN}✅ Wallet setup script created${NC}"
    echo ""
}

# Function to create testnet environment file
create_testnet_env() {
    echo -e "${BLUE}📝 Creating Testnet Environment File...${NC}"
    
    # Get RPC password
    RPC_PASS=$(grep rpcpassword ~/lightcat-testnet/bitcoin/bitcoin.conf | cut -d= -f2)
    
    cat > ~/lightcat-testnet/.env.testnet << EOF
# LIGHTCAT Testnet Configuration
NODE_ENV=development
ENVIRONMENT=testnet
NETWORK=testnet

# Server
PORT=3000
CLIENT_URL=http://localhost:8082
API_BASE_URL=http://localhost:3000

# Database (Use local SQLite for testnet)
DATABASE_URL=sqlite://~/lightcat-testnet/database.sqlite

# RGB Protocol
RGB_NODE_URL=http://localhost:50001
RGB_WALLET_PATH=$HOME/lightcat-testnet/rgb/wallets/lightcat-testnet
RGB_WALLET_PASSWORD=testnet-password-change-me
RGB_ASSET_ID=TO_BE_GENERATED
RGB_NETWORK=testnet

# Lightning Network
LIGHTNING_IMPLEMENTATION=LND
LIGHTNING_NODE_URL=https://localhost:8080
LIGHTNING_MACAROON_PATH=$HOME/lightcat-testnet/lightning/lnd/data/chain/bitcoin/testnet/admin.macaroon
LIGHTNING_TLS_CERT_PATH=$HOME/lightcat-testnet/lightning/lnd/tls.cert

# Bitcoin RPC
BITCOIN_RPC_USER=lightcat
BITCOIN_RPC_PASS=$RPC_PASS
BITCOIN_RPC_HOST=localhost
BITCOIN_RPC_PORT=18332

# Security (testnet values)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
ADMIN_PASSWORD_HASH=\$2b\$12\$testnet

# Game Configuration
GAME_TIER_1_SCORE=11
GAME_TIER_2_SCORE=18
GAME_TIER_3_SCORE=28

# Token Configuration
TOTAL_SUPPLY=21000000
TOKENS_PER_BATCH=700
SATOSHIS_PER_BATCH=100  # Cheap for testnet
EOF

    echo -e "${GREEN}✅ Testnet environment file created${NC}"
    echo ""
}

# Function to display next steps
show_next_steps() {
    echo -e "${YELLOW}📋 TESTNET SETUP COMPLETE!${NC}"
    echo "========================================"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo ""
    echo "1. Start Bitcoin Core:"
    echo "   sudo systemctl start bitcoind-testnet"
    echo "   sudo systemctl enable bitcoind-testnet"
    echo ""
    echo "2. Wait for sync (check progress):"
    echo "   bitcoin-cli -testnet getblockchaininfo"
    echo ""
    echo "3. Start LND:"
    echo "   sudo systemctl start lnd-testnet"
    echo "   sudo systemctl enable lnd-testnet"
    echo ""
    echo "4. Start RGB Node:"
    echo "   sudo systemctl start rgb-testnet"
    echo "   sudo systemctl enable rgb-testnet"
    echo ""
    echo "5. Run wallet setup:"
    echo "   ~/lightcat-testnet/setup-wallet.sh"
    echo ""
    echo "6. Copy testnet env to project:"
    echo "   cp ~/lightcat-testnet/.env.testnet /path/to/litecat-website/.env"
    echo ""
    echo "7. Update RGB_ASSET_ID in .env with generated asset ID"
    echo ""
    echo -e "${GREEN}Happy testing! 🚀${NC}"
}

# Main execution
main() {
    check_root
    create_testnet_dirs
    install_bitcoin_testnet
    install_lnd_testnet
    install_rgb_node
    create_systemd_services
    setup_testnet_wallet
    create_testnet_env
    show_next_steps
}

# Run main function
main