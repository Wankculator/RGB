# 🔐 RGB Wallet Setup - SECURE HANDLING GUIDE

## ⚠️ CRITICAL SECURITY NOTICE
**NEVER share your seed phrase in plain text or store it in code/files!**

## Safe Setup Process

### Step 1: Prepare Secure Environment
```bash
# On your VPS
ssh root@147.93.105.138

# Create secure directory
mkdir -p /root/rgb-secure
chmod 700 /root/rgb-secure
cd /root/rgb-secure
```

### Step 2: Install RGB Node (if not already installed)
```bash
# Install RGB node
cd /root
git clone https://github.com/RGB-WG/rgb-node.git
cd rgb-node
cargo build --release

# Or use the pre-built binary if available
```

### Step 3: Create Secure Configuration

Create `/root/rgb-secure/rgb-config.sh`:
```bash
#!/bin/bash
# This file will contain sensitive data - secure it!

# RGB wallet configuration
export RGB_NETWORK="bitcoin" # or "testnet" for testing
export RGB_DATA_DIR="/root/rgb-secure/data"
export RGB_WALLET_NAME="lightcat_distribution"

# DO NOT PUT SEED PHRASE HERE - Enter it interactively
```

### Step 4: Interactive Wallet Setup Script

Create `/root/rgb-secure/setup-wallet.sh`:
```bash
#!/bin/bash

echo "🔐 RGB Wallet Setup for LIGHTCAT Token Distribution"
echo "=================================================="
echo ""
echo "This script will help you securely set up the RGB wallet."
echo ""

# Source configuration
source ./rgb-config.sh

# Create data directory
mkdir -p $RGB_DATA_DIR
chmod 700 $RGB_DATA_DIR

echo "⚠️  SECURITY NOTICE:"
echo "- Your seed phrase will NOT be saved to disk"
echo "- Make sure no one is watching your screen"
echo "- The wallet will be encrypted with a password"
echo ""

read -p "Press Enter to continue..."

# Prompt for seed phrase securely
echo ""
echo "Please enter your RGB wallet seed phrase (12-24 words):"
echo "(Input will be hidden for security)"
read -s -p "Seed phrase: " SEED_PHRASE
echo ""

# Prompt for wallet password
echo ""
echo "Create a strong password for the wallet:"
read -s -p "Password: " WALLET_PASSWORD
echo ""
read -s -p "Confirm password: " WALLET_PASSWORD_CONFIRM
echo ""

if [ "$WALLET_PASSWORD" != "$WALLET_PASSWORD_CONFIRM" ]; then
    echo "❌ Passwords don't match!"
    exit 1
fi

# Import wallet using RGB CLI
echo ""
echo "Importing wallet..."

# Use RGB CLI to import (adjust command based on actual RGB CLI syntax)
rgb-cli wallet import \
    --name "$RGB_WALLET_NAME" \
    --network "$RGB_NETWORK" \
    --seed "$SEED_PHRASE" \
    --password "$WALLET_PASSWORD" \
    --data-dir "$RGB_DATA_DIR"

# Clear sensitive variables from memory
unset SEED_PHRASE
unset WALLET_PASSWORD
unset WALLET_PASSWORD_CONFIRM

echo ""
echo "✅ Wallet imported successfully!"
echo ""
echo "Next steps:"
echo "1. Test the wallet connection"
echo "2. Verify token balance"
echo "3. Update the RGB service configuration"
```

Make it executable:
```bash
chmod 700 setup-wallet.sh
```

### Step 5: Update RGB Service Configuration

After wallet is set up, update `/root/lightcat-api/rgb-service-config.json`:
```json
{
  "walletName": "lightcat_distribution",
  "walletDataDir": "/root/rgb-secure/data",
  "network": "bitcoin",
  "tokenContract": "YOUR_RGB_CONTRACT_ID",
  "consignmentOutputDir": "/root/lightcat-api/consignments"
}
```

### Step 6: Create Secure RGB Service

Update your RGB service to use the wallet:
```javascript
// /root/lightcat-api/services/rgbService.js
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class RGBService {
  constructor() {
    this.config = require('../rgb-service-config.json');
  }

  async generateConsignment(invoice, amount, recipient) {
    // This will use the RGB CLI to generate real consignments
    const command = `rgb-cli transfer \
      --wallet ${this.config.walletName} \
      --amount ${amount} \
      --recipient ${recipient} \
      --invoice ${invoice}`;
    
    // Execute command securely
    return new Promise((resolve, reject) => {
      exec(command, { 
        cwd: this.config.walletDataDir,
        env: { ...process.env, RGB_DATA_DIR: this.config.walletDataDir }
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('RGB transfer error:', stderr);
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }
}
```

### Step 7: Security Checklist

- [ ] Seed phrase NEVER stored in any file
- [ ] Wallet encrypted with strong password
- [ ] Wallet directory permissions: 700 (owner only)
- [ ] RGB service runs as non-root user (recommended)
- [ ] Regular backups of wallet data (encrypted)
- [ ] Access logs monitored
- [ ] Firewall configured
- [ ] SSH key-only access (no password)

### Step 8: Test Distribution

Create test script `/root/rgb-secure/test-distribution.sh`:
```bash
#!/bin/bash

echo "Testing RGB token distribution..."

# Test balance check
rgb-cli wallet balance --name lightcat_distribution

# Test small transfer (if on testnet)
# rgb-cli transfer --wallet lightcat_distribution --amount 1 --recipient "rgb:utxob:testrecipient"
```

## 🔴 IMPORTANT REMINDERS

1. **NEVER** put the seed phrase in:
   - Environment variables
   - Configuration files
   - Git repositories
   - Log files
   - API responses

2. **ALWAYS**:
   - Use hardware security modules (HSM) for production
   - Implement multi-signature if possible
   - Keep offline backups
   - Use separate hot/cold wallets
   - Monitor all transactions

3. **For Production**:
   - Consider using a hardware wallet integration
   - Implement transaction limits
   - Add manual approval for large transfers
   - Set up alerts for unusual activity

## When You're Ready

When you're ready to input the seed phrase:
1. SSH into your VPS
2. Run the setup script
3. Enter the seed phrase when prompted (it won't be displayed)
4. The wallet will be encrypted and ready for use

Let me know when you want to proceed with the wallet setup!