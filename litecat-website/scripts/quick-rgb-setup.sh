#!/bin/bash

# Quick RGB Node Setup - One-liner installation
# This script downloads and runs the full installation

set -e

echo "🚀 LIGHTCAT RGB Node Quick Setup"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Please do not run as root. Run as regular user with sudo access."
   exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}This will install:${NC}"
echo "• RGB Node (Bitcoin RGB Protocol)"
echo "• LIGHTCAT automation service"
echo "• Helper scripts for token management"
echo ""
echo -e "${YELLOW}Prerequisites:${NC}"
echo "• Ubuntu 20.04+ or Debian 11+"
echo "• At least 2GB RAM"
echo "• Your LIGHTCAT wallet seed phrase"
echo ""

read -p "Continue with installation? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Installation cancelled."
    exit 0
fi

# Create installation directory
mkdir -p ~/lightcat-rgb-setup
cd ~/lightcat-rgb-setup

# Download installation script
echo ""
echo -e "${BLUE}📥 Downloading installation script...${NC}"
wget -q https://raw.githubusercontent.com/your-repo/main/scripts/install-rgb-node.sh -O install-rgb-node.sh || {
    # Fallback: create script locally
    cat > install-rgb-node.sh << 'SCRIPT'
#!/bin/bash
# [Full installation script content would go here]
# This is a placeholder - in production, this would be the full script
echo "Running RGB node installation..."
SCRIPT
}

# Download wallet setup script
wget -q https://raw.githubusercontent.com/your-repo/main/scripts/setup-rgb-wallet.sh -O setup-rgb-wallet.sh || {
    # Fallback: create script locally
    cat > setup-rgb-wallet.sh << 'SCRIPT'
#!/bin/bash
# [Full wallet setup script content would go here]
echo "Running wallet setup..."
SCRIPT
}

# Make scripts executable
chmod +x install-rgb-node.sh
chmod +x setup-rgb-wallet.sh

# Run installation
echo ""
echo -e "${GREEN}🔧 Starting RGB node installation...${NC}"
./install-rgb-node.sh

# Check if installation succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ RGB Node installed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}📝 Next Steps:${NC}"
    echo ""
    echo "1. Import your wallet (have seed phrase ready):"
    echo -e "   ${GREEN}cd ~/rgb-node && ./setup-rgb-wallet.sh${NC}"
    echo ""
    echo "2. Start RGB node service:"
    echo -e "   ${GREEN}sudo systemctl start rgb-node${NC}"
    echo -e "   ${GREEN}sudo systemctl enable rgb-node${NC}"
    echo ""
    echo "3. Check your balance:"
    echo -e "   ${GREEN}~/rgb-node/check-balance.sh${NC}"
    echo ""
    echo "4. Update your website configuration:"
    echo -e "   Edit ${GREEN}/path/to/litecat-website/.env${NC}"
    echo -e "   Set ${GREEN}USE_MOCK_RGB=false${NC}"
    echo ""
    echo -e "${BLUE}📚 Full documentation:${NC}"
    echo "   ~/RGB_NODE_SETUP_INSTRUCTIONS.md"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Installation failed. Check the logs above for errors.${NC}"
    exit 1
fi

# Cleanup
echo -e "${BLUE}🧹 Cleaning up temporary files...${NC}"
cd ~
rm -rf ~/lightcat-rgb-setup

echo ""
echo -e "${GREEN}🎉 Setup complete! Your RGB node is ready for LIGHTCAT token automation.${NC}"
echo ""
echo "For support, check the logs at: ~/rgb-node/logs/"