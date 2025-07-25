# 🧪 RGB Testnet Setup Guide

## Why Testnet First?
- Test with worthless tokens before real money
- Iron out all bugs safely
- Verify consignment generation works
- Test wallet integration without risk

## Setup Process

### Step 1: Create RGB Testnet Wallet
```bash
# SSH into your VPS
ssh root@147.93.105.138

# Create directory for testnet
mkdir -p /root/rgb-testnet
cd /root/rgb-testnet

# Install RGB CLI if not already installed
# Use testnet configuration
```

### Step 2: Create Test Tokens
If you don't have testnet LIGHTCAT tokens yet:
```bash
# Issue test tokens on RGB testnet
rgb-cli --network testnet issue \
  --ticker LIGHTCAT \
  --name "LightCat Test" \
  --supply 21000000 \
  --precision 0
```

### Step 3: Import Testnet Wallet
Create `/root/rgb-testnet/import-testnet-wallet.sh`:
```bash
#!/bin/bash

echo "🧪 RGB Testnet Wallet Import"
echo "============================"
echo ""
echo "This will import your TESTNET wallet (not mainnet!)"
echo ""

# Prompt for testnet seed phrase
echo "Enter your TESTNET seed phrase:"
echo "(This should be a different wallet than mainnet)"
read -s SEED_PHRASE

echo ""
echo "Create password for testnet wallet:"
read -s WALLET_PASS

# Import testnet wallet
rgb-cli --network testnet wallet import \
  --name lightcat_testnet \
  --seed "$SEED_PHRASE" \
  --password "$WALLET_PASS"

# Clear from memory
unset SEED_PHRASE
unset WALLET_PASS

echo "✅ Testnet wallet imported!"
```

### Step 4: Update API for Testnet
```javascript
// Add to .env
RGB_NETWORK=testnet
RGB_WALLET_NAME=lightcat_testnet
USE_MOCK_RGB=false
USE_TESTNET=true

// Update rgbService.js
async generateConsignment({ rgbInvoice, amount, invoiceId }) {
  if (process.env.USE_MOCK_RGB === 'true') {
    return 'base64mockrgbconsignmentfile';
  }
  
  // Real RGB testnet consignment generation
  const command = `rgb-cli --network ${process.env.RGB_NETWORK} transfer \
    --wallet ${process.env.RGB_WALLET_NAME} \
    --amount ${amount} \
    --invoice ${rgbInvoice} \
    --consignment /tmp/consignment_${invoiceId}.rgb`;
    
  // Execute and return base64 encoded consignment
  // ...
}
```

### Step 5: Test Complete Flow on Testnet

1. **Get testnet Bitcoin**:
   - https://testnet-faucet.mempool.co/
   - https://bitcoinfaucet.uo1.net/

2. **Test the flow**:
   ```bash
   # Create testnet RGB invoice
   rgb-cli --network testnet invoice create
   
   # Use that invoice on your website
   # Pay with testnet Bitcoin
   # Verify you receive testnet RGB tokens
   ```

### Step 6: Testnet Checklist
- [ ] Testnet BTCPay working
- [ ] Testnet RGB wallet imported
- [ ] Test tokens available in wallet
- [ ] Consignment generation works
- [ ] Full payment flow tested
- [ ] Error handling verified
- [ ] Performance acceptable

## Switching to Mainnet

Once everything works perfectly on testnet:

1. **Change configuration**:
   ```bash
   RGB_NETWORK=bitcoin
   RGB_WALLET_NAME=lightcat_mainnet
   USE_TESTNET=false
   ```

2. **Import mainnet wallet** (one time, secure process)

3. **Test with small amounts first**

## Current Status

Right now your system is set up for:
- ✅ Bitcoin testnet payments (via BTCPay)
- ❌ Mock RGB tokens (fake consignments)

We should set up:
- ✅ Bitcoin testnet payments
- ✅ RGB testnet tokens (real testnet consignments)

Then later:
- ✅ Bitcoin mainnet payments
- ✅ RGB mainnet tokens

This is the safe, professional approach!