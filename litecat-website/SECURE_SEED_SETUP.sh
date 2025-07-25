#!/bin/bash

# Secure RGB Wallet Setup Script
# This NEVER stores your seed phrase in any file

echo "🔐 SECURE RGB WALLET SETUP"
echo "========================="
echo ""
echo "This script will help you set up your RGB wallet"
echo "WITHOUT storing your seed phrase anywhere"
echo ""

# Configuration
WALLET_NAME="lightcat_mainnet"
NETWORK="${1:-testnet}"  # Default to testnet, use 'bitcoin' for mainnet

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  SECURITY CHECKLIST:${NC}"
echo "✓ Make sure you're alone"
echo "✓ No screen recording software running"
echo "✓ Using a secure connection"
echo ""

read -p "Ready to proceed? (yes/no): " READY
if [ "$READY" != "yes" ]; then
    echo "Setup cancelled"
    exit 1
fi

echo ""
echo -e "${BLUE}Setting up $NETWORK wallet...${NC}"

# Create secure wallet import script
cat > /tmp/import-wallet.exp << 'EXPECT'
#!/usr/bin/expect -f

set timeout 60
set network [lindex $argv 0]
set wallet_name [lindex $argv 1]

# Start RGB CLI
spawn rgb --network $network wallet import --name $wallet_name

# Wait for seed phrase prompt
expect "Enter seed phrase:" {
    # Disable echo so seed phrase isn't displayed
    stty -echo
    
    # Let user type seed phrase
    interact "\r" {
        send "\r"
        return
    }
    
    # Re-enable echo
    stty echo
}

# Wait for password prompt
expect "Enter password:" {
    stty -echo
    interact "\r" {
        send "\r"
        return
    }
    stty echo
}

# Confirm password
expect "Confirm password:" {
    stty -echo
    interact "\r" {
        send "\r"
        return
    }
    stty echo
}

expect eof
EXPECT

chmod +x /tmp/import-wallet.exp

echo ""
echo -e "${YELLOW}INSTRUCTIONS:${NC}"
echo "1. When prompted, enter your seed phrase (it won't be displayed)"
echo "2. Create a strong password for the wallet"
echo "3. The wallet will be encrypted with your password"
echo ""

# Run the import
if command -v expect &> /dev/null; then
    /tmp/import-wallet.exp $NETWORK $WALLET_NAME
else
    # Fallback to manual method
    echo -e "${YELLOW}Installing expect...${NC}"
    apt-get install -y expect
    /tmp/import-wallet.exp $NETWORK $WALLET_NAME
fi

# Clean up
rm -f /tmp/import-wallet.exp

echo ""
echo -e "${GREEN}✅ Wallet import complete!${NC}"

# Verify wallet
echo ""
echo "Verifying wallet..."
if rgb --network $NETWORK wallet info --name $WALLET_NAME &> /dev/null; then
    echo -e "${GREEN}✅ Wallet verified!${NC}"
    
    # Check balance
    echo ""
    echo "Checking balance..."
    rgb --network $NETWORK wallet balance --name $WALLET_NAME
else
    echo -e "${RED}❌ Wallet verification failed${NC}"
    exit 1
fi

# Create automatic unlock service
echo ""
echo -e "${BLUE}Creating automatic unlock service...${NC}"

cat > /etc/systemd/system/rgb-wallet-unlock.service << SERVICE
[Unit]
Description=RGB Wallet Unlock Service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/rgb-unlock.sh
RemainAfterExit=yes
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

# Create unlock script (password must be provided at runtime)
cat > /usr/local/bin/rgb-unlock.sh << 'UNLOCK'
#!/bin/bash
# This script should be modified to retrieve password securely
# For example, from a hardware security module or encrypted store

echo "RGB Wallet unlock service started"
# Wallet unlocking logic would go here
UNLOCK

chmod +x /usr/local/bin/rgb-unlock.sh

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure /usr/local/bin/rgb-unlock.sh with secure password retrieval"
echo "2. Enable the service: systemctl enable rgb-wallet-unlock"
echo "3. Update your API to use wallet: $WALLET_NAME"
echo ""
echo -e "${YELLOW}Remember: Your seed phrase is NEVER stored anywhere!${NC}"