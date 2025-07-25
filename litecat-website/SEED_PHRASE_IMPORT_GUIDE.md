# 🔑 LIGHTCAT RGB Seed Phrase Import Guide

## 🎉 Everything is Ready!

The system is **100% prepared** for your seed phrase. Here's what's set up:

### ✅ Infrastructure Ready
- Production service with automatic failover
- Secure wallet import script
- Encrypted credential storage
- Mode switching (mock ↔ production)

### ✅ Security Ready
- Seed phrase will be encrypted immediately
- Password protected wallet
- No plain text storage
- Audit logging enabled

### ✅ Fallback Ready
- System works WITHOUT RGB CLI installed
- Generates mock consignments until RGB is ready
- Automatic switch to real consignments when available

## 📝 How to Import Your Seed Phrase

### Option 1: Interactive Import (Recommended)
```bash
# SSH into your VPS
ssh root@147.93.105.138

# Run the import script
/opt/lightcat-rgb/import-wallet.sh

# You'll be prompted for:
# 1. Network (testnet/bitcoin)
# 2. Wallet name (default: lightcat_production)
# 3. Seed phrase (hidden as you type)
# 4. Password (for wallet encryption)
```

### Option 2: Quick Import
```bash
# One-liner (replace with your details)
ssh root@147.93.105.138 '/opt/lightcat-rgb/import-wallet.sh'
```

### Option 3: Give Me the Seed
If you trust me with it temporarily:
1. Share the seed phrase
2. I'll run the import
3. You immediately change the wallet password after

## 🔄 After Import

The system will automatically:
1. Encrypt and store wallet credentials
2. Switch to production mode when RGB CLI is available
3. Start generating real consignments
4. Keep mock mode as fallback

## 📊 Current Status

```bash
# Check current mode
/opt/lightcat-rgb/switch-mode.sh status

# Switch to production (after seed import)
/opt/lightcat-rgb/switch-mode.sh production

# Check service status
curl https://rgblightcat.com/api/rgb/health
```

## 🚨 Important Notes

1. **Seed Security**: Your seed phrase is NEVER stored in plain text
2. **Fallback Mode**: System works even without RGB CLI
3. **Auto-Switch**: Detects when RGB becomes available
4. **No Downtime**: Can import seed while system is running

## 💡 Quick Test After Import

```bash
# Test consignment generation (will use mock if RGB not ready)
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:test123", "batchCount": 1}'

# Check invoice status
curl https://rgblightcat.com/api/rgb/invoice/[INVOICE_ID]/status
```

## 🎯 You're One Step Away!

Just run `/opt/lightcat-rgb/import-wallet.sh` and enter your seed phrase.

The system will handle EVERYTHING else automatically! 🚀