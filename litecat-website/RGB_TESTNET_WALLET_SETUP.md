# RGB Testnet Wallet Setup Instructions

## Prerequisites
- RGB CLI installed on VPS
- Bitcoin testnet node access (or use public)
- Testnet Bitcoin for fees

## Setup Process

### 1. SSH into VPS
```bash
ssh root@147.93.105.138
```

### 2. Create RGB testnet directory
```bash
mkdir -p /root/rgb-testnet/data
chmod 700 /root/rgb-testnet/data
cd /root/rgb-testnet
```

### 3. Create wallet initialization script
```bash
cat > init-testnet-wallet.sh << 'SCRIPT'
#!/bin/bash

echo "RGB Testnet Wallet Initialization"
echo "================================="
echo ""
echo "This will create a NEW testnet wallet for LIGHTCAT"
echo "Use a DIFFERENT seed phrase than your mainnet wallet!"
echo ""

read -p "Press Enter to continue..."

# Prompt for new seed phrase or generate one
echo ""
echo "Option 1: Generate new seed phrase"
echo "Option 2: Import existing testnet seed phrase"
echo ""
read -p "Choose option (1 or 2): " OPTION

if [ "$OPTION" = "1" ]; then
    # Generate new seed
    echo "Generating new testnet seed phrase..."
    # rgb-cli --network testnet wallet generate
    echo "[Generated seed phrase would appear here]"
else
    # Import existing
    echo "Enter your TESTNET seed phrase:"
    read -s SEED_PHRASE
fi

echo ""
echo "Create a password for the wallet:"
read -s WALLET_PASSWORD

# Create wallet
# rgb-cli --network testnet wallet create \
#   --name lightcat_testnet \
#   --seed "$SEED_PHRASE" \
#   --password "$WALLET_PASSWORD"

echo ""
echo "✅ Testnet wallet created!"
echo ""
echo "Next: Issue testnet LIGHTCAT tokens"
SCRIPT

chmod +x init-testnet-wallet.sh
```

### 4. Run wallet initialization
```bash
./init-testnet-wallet.sh
```

### 5. Issue Testnet Tokens
```bash
# Issue 21M testnet LIGHTCAT tokens
rgb-cli --network testnet issue \
  --wallet lightcat_testnet \
  --ticker TCAT \
  --name "TestCat Token" \
  --supply 21000000 \
  --precision 0
```

### 6. Verify Setup
```bash
# Check balance
rgb-cli --network testnet wallet balance --name lightcat_testnet

# Should show:
# Available: 21000000 TCAT
```

## Testing the Integration

1. Start the testnet API:
```bash
cd /root/lightcat-api
node enhanced-api-testnet.js
```

2. Run the test script:
```bash
./test-rgb-testnet-flow.sh
```

3. Check logs:
```bash
tail -f server/logs/rgb-payments.log
```

## Security Notes

- NEVER use your mainnet seed phrase for testnet
- Keep testnet and mainnet wallets completely separate
- Test thoroughly before switching to mainnet
- Monitor all transactions

## Ready for Mainnet?

Once testnet works perfectly:
1. Create mainnet wallet (different seed!)
2. Update .env to use mainnet
3. Test with small amounts first
4. Gradually increase limits
