#!/bin/bash

# RGB CLI Installation Script for VPS
echo "🚀 RGB CLI Installation for LIGHTCAT"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

echo -e "${YELLOW}Installing dependencies...${NC}"

# Update system
apt-get update
apt-get install -y build-essential pkg-config libssl-dev

# Install Rust if not present
if ! command -v cargo &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Create RGB directory
mkdir -p /opt/rgb
cd /opt/rgb

echo -e "${YELLOW}Installing RGB CLI...${NC}"

# Clone RGB node repository
git clone https://github.com/RGB-WG/rgb-node.git
cd rgb-node

# Build RGB CLI
cargo build --release --bins

# Install binaries
cp target/release/rgb* /usr/local/bin/

# Verify installation
if rgb --version &> /dev/null; then
    echo -e "${GREEN}✅ RGB CLI installed successfully!${NC}"
    rgb --version
else
    echo -e "${RED}❌ RGB CLI installation failed${NC}"
    exit 1
fi

# Create RGB data directory
mkdir -p /root/.rgb
chmod 700 /root/.rgb

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Create testnet wallet: rgb --network testnet wallet create"
echo "2. Issue test tokens: rgb --network testnet issue --ticker TCAT --supply 21000000"
echo "3. Test consignment generation"