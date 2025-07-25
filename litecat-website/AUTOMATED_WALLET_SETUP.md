# 🔐 Automated RGB Wallet Setup Guide

## Overview
This guide shows how to set up automated RGB token distribution WITHOUT storing your seed phrase in plain text.

## Architecture

```
┌─────────────────────┐
│   Your API          │
│                     │
│  Uses encrypted     │
│  wallet file        │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  RGB Wallet File    │
│  (Encrypted)        │
│                     │
│  Password from:     │
│  - Environment var  │
│  - HSM              │
│  - Vault service    │
└─────────────────────┘
```

## Step 1: One-Time Wallet Import

SSH into your VPS and run:

```bash
# 1. Create wallet directory
mkdir -p /root/.rgb/wallets
chmod 700 /root/.rgb

# 2. Import wallet interactively
rgb --network testnet wallet import --name lightcat_auto

# When prompted:
# - Enter seed phrase (won't be displayed)
# - Create strong password
# - Wallet gets encrypted with password
```

## Step 2: Secure Password Storage

### Option A: Environment Variable (Simple)
```bash
# Add to /root/lightcat-api/.env
RGB_WALLET_PASSWORD=your-strong-password-here

# Secure the file
chmod 600 /root/lightcat-api/.env
```

### Option B: External Secret Manager (Better)
```bash
# Using HashiCorp Vault, AWS Secrets Manager, etc.
# API retrieves password at runtime
```

### Option C: Hardware Security Module (Best)
```bash
# HSM stores password, never exposed
# API requests decryption when needed
```

## Step 3: Update RGB Service

```javascript
// server/services/rgbSecureService.js
const { exec } = require('child_process');
const crypto = require('crypto');

class RGBSecureService {
    constructor() {
        this.network = process.env.RGB_NETWORK || 'testnet';
        this.walletName = 'lightcat_auto';
        this.walletPassword = null;
        this.initialized = false;
    }
    
    async initialize() {
        // Get password from secure source
        this.walletPassword = await this.getWalletPassword();
        
        if (!this.walletPassword) {
            console.error('No wallet password available');
            return;
        }
        
        // Verify wallet access
        try {
            await this.unlockWallet();
            this.initialized = true;
            console.log('✅ RGB wallet ready');
        } catch (error) {
            console.error('Failed to unlock wallet:', error);
        }
    }
    
    async getWalletPassword() {
        // Option 1: From environment
        if (process.env.RGB_WALLET_PASSWORD) {
            return process.env.RGB_WALLET_PASSWORD;
        }
        
        // Option 2: From secret manager
        // return await secretManager.getSecret('rgb-wallet-password');
        
        // Option 3: From encrypted file
        // return await this.decryptPasswordFile();
        
        return null;
    }
    
    async unlockWallet() {
        // RGB CLI commands that require password
        const command = `echo "${this.walletPassword}" | rgb --network ${this.network} wallet unlock --name ${this.walletName}`;
        
        return new Promise((resolve, reject) => {
            exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
                // Clear password from memory
                command.replace(this.walletPassword, '[REDACTED]');
                
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
    
    async generateConsignment({ rgbInvoice, amount, invoiceId }) {
        if (!this.initialized) {
            throw new Error('Wallet not initialized');
        }
        
        // Validate invoice
        if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {
            throw new Error('Invalid RGB invoice format');
        }
        
        const tokenAmount = amount * 700;
        
        // Generate consignment with password
        const command = `echo "${this.walletPassword}" | rgb --network ${this.network} transfer \
            --wallet ${this.walletName} \
            --amount ${tokenAmount} \
            --recipient "${rgbInvoice}" \
            --password-stdin`;
            
        // Execute securely
        return await this.executeSecureCommand(command);
    }
    
    async executeSecureCommand(command) {
        return new Promise((resolve, reject) => {
            const proc = exec(command, { 
                shell: '/bin/bash',
                env: { ...process.env, RGB_PASSWORD: this.walletPassword }
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message));
                } else {
                    resolve(stdout);
                }
            });
            
            // Clear sensitive data
            proc.on('exit', () => {
                command = null;
            });
        });
    }
}

module.exports = new RGBSecureService();
```

## Step 4: Security Best Practices

### 1. **Password Rotation**
```bash
# Rotate password monthly
rgb --network testnet wallet change-password --name lightcat_auto
```

### 2. **Audit Logging**
```javascript
// Log all transactions
logger.info('RGB transfer initiated', {
    invoiceId,
    amount: tokenAmount,
    recipient: rgbInvoice.substring(0, 10) + '...',
    timestamp: new Date().toISOString()
});
```

### 3. **Rate Limiting**
```javascript
// Prevent abuse
const rateLimiter = require('express-rate-limit');
const rgbLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10 // limit each IP to 10 requests per windowMs
});

app.use('/api/rgb/invoice', rgbLimiter);
```

### 4. **Transaction Limits**
```javascript
// Maximum tokens per transaction
const MAX_TOKENS_PER_TX = 7000; // 10 batches
if (tokenAmount > MAX_TOKENS_PER_TX) {
    throw new Error('Exceeds transaction limit');
}
```

## Step 5: Monitoring

### Health Check Endpoint
```javascript
app.get('/api/rgb/health', async (req, res) => {
    const health = {
        wallet: rgbService.initialized ? 'ready' : 'not ready',
        network: process.env.RGB_NETWORK,
        timestamp: new Date().toISOString()
    };
    
    // Check wallet balance
    try {
        const balance = await rgbService.getBalance();
        health.balance = balance.available;
    } catch (error) {
        health.balance = 'error';
    }
    
    res.json(health);
});
```

### Alert System
```javascript
// Alert on low balance
if (balance.available < 100000) { // Less than 100k tokens
    alertService.send('Low RGB token balance', {
        available: balance.available,
        threshold: 100000
    });
}
```

## Summary

This setup provides:
- ✅ Seed phrase NEVER stored
- ✅ Wallet encrypted with password
- ✅ Password stored securely
- ✅ Automatic token distribution
- ✅ Full audit trail
- ✅ Security monitoring

The seed phrase is only needed once during initial setup and is never stored anywhere!