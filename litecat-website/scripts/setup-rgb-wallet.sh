#!/bin/bash

# Secure RGB Wallet Setup Script
# This script safely imports your seed phrase without exposing it

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔐 Secure RGB Wallet Setup${NC}"
echo -e "${BLUE}=========================${NC}"
echo ""

# Security checks
echo -e "${YELLOW}⚠️  SECURITY CHECKLIST:${NC}"
echo "✓ Make sure you're on a secure server"
echo "✓ No one can see your screen"
echo "✓ You're using a secure SSH connection"
echo "✓ You have your seed phrase ready"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Check if RGB node is installed
if ! command -v rgb-cli &> /dev/null; then
    echo -e "${RED}❌ RGB node not installed. Run install-rgb-node.sh first.${NC}"
    exit 1
fi

# Check if wallet already exists
if rgb-cli wallet list 2>/dev/null | grep -q "lightcat-main"; then
    echo -e "${YELLOW}⚠️  Wallet 'lightcat-main' already exists.${NC}"
    read -p "Do you want to overwrite it? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Create secure input for seed phrase
echo -e "${GREEN}📝 Seed Phrase Input${NC}"
echo "Enter your seed phrase (12 or 24 words)."
echo "Note: The words will be hidden as you type for security."
echo ""

# Read seed phrase word by word
WORDS=()
WORD_COUNT=0

while true; do
    WORD_COUNT=$((WORD_COUNT + 1))
    read -s -p "Word $WORD_COUNT (or press Enter when done): " WORD
    echo "" # New line after hidden input
    
    if [ -z "$WORD" ]; then
        break
    fi
    
    WORDS+=("$WORD")
    echo "✓ Word $WORD_COUNT entered"
done

# Validate word count
TOTAL_WORDS=${#WORDS[@]}
if [ $TOTAL_WORDS -ne 12 ] && [ $TOTAL_WORDS -ne 24 ]; then
    echo -e "${RED}❌ Invalid seed phrase. Expected 12 or 24 words, got $TOTAL_WORDS${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Received $TOTAL_WORDS words${NC}"
echo ""

# Import wallet
echo -e "${BLUE}📥 Importing wallet...${NC}"

# Join words into seed phrase
SEED_PHRASE="${WORDS[*]}"

# Import using RGB CLI
if rgb-cli wallet import --words "$SEED_PHRASE" --name "lightcat-main" 2>/dev/null; then
    echo -e "${GREEN}✅ Wallet imported successfully!${NC}"
else
    echo -e "${RED}❌ Failed to import wallet${NC}"
    # Clear sensitive data
    unset SEED_PHRASE
    unset WORDS
    exit 1
fi

# Clear sensitive data immediately
unset SEED_PHRASE
unset WORDS

# Sync wallet
echo ""
echo -e "${BLUE}🔄 Syncing wallet...${NC}"
rgb-cli wallet sync

# Check LIGHTCAT balance
echo ""
echo -e "${BLUE}💰 Checking LIGHTCAT balance...${NC}"
ASSET_ID="rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po"
BALANCE=$(rgb-cli asset balance "$ASSET_ID" 2>/dev/null || echo "0")

echo -e "${GREEN}Balance: $BALANCE LIGHTCAT tokens${NC}"

# Create backup
echo ""
echo -e "${BLUE}💾 Creating wallet backup...${NC}"
BACKUP_DIR="$HOME/rgb-node/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/wallet_$TIMESTAMP.backup"

if rgb-cli wallet export --output "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
    chmod 600 "$BACKUP_FILE" # Restrict permissions
else
    echo -e "${YELLOW}⚠️  Backup creation failed${NC}"
fi

# Setup auto-start
echo ""
echo -e "${BLUE}🚀 Setting up auto-start...${NC}"
if sudo systemctl enable rgb-node 2>/dev/null; then
    sudo systemctl start rgb-node
    echo -e "${GREEN}✅ RGB node service enabled${NC}"
else
    echo -e "${YELLOW}⚠️  Could not enable auto-start${NC}"
fi

# Final security recommendations
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}🔒 Security Recommendations:${NC}"
echo "1. Delete this terminal's history: history -c"
echo "2. Keep your seed phrase offline and secure"
echo "3. Monitor the wallet balance regularly"
echo "4. Set up automated backups"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo "Check balance: ~/rgb-node/check-balance.sh"
echo "View logs: tail -f ~/rgb-node/logs/rgb-node.log"
echo "Transfer tokens: ~/rgb-node/transfer-tokens.sh <invoice> <amount>"
echo ""

# Clear bash history for this session
history -c 2>/dev/null || true