# 🔐 RGB Seed Phrase Setup Guide

## Overview

Your RGB seed phrase controls the LIGHTCAT tokens. This guide helps you set it up securely.

## ⚠️ CRITICAL SECURITY

**NEVER**:
- Type your seed phrase in any web form
- Store it in plain text files
- Share it with anyone
- Enter it on an unsecured machine

**ALWAYS**:
- Use a secure, private environment
- Clear terminal history after setup
- Keep encrypted backups
- Use hardware security if possible

## Setup Options

### Option 1: Mock Setup (For Testing) ✅ RECOMMENDED FOR NOW

```bash
# Use mock RGB for testing
./scripts/setup-rgb-mock.sh

# This allows you to:
# - Test the full payment flow
# - Verify everything works
# - Postpone seed phrase setup until production
```

### Option 2: Real RGB Setup (For Production)

When you're ready for production with real tokens:

```bash
# Run the secure setup script
./scripts/setup-rgb-wallet.sh

# This will:
# 1. Install RGB node
# 2. Securely import your seed phrase
# 3. Check LIGHTCAT balance
# 4. Create encrypted backups
# 5. Set up automation
```

## Seed Phrase Security Best Practices

### Before Setup:
1. **Secure Environment**
   - Use a dedicated secure server
   - Ensure no screen recording/sharing
   - Disconnect unnecessary services

2. **Preparation**
   - Have your 24-word seed phrase ready
   - Ensure you're alone
   - Close all unnecessary applications

### During Setup:
1. **Entry Method**
   - Type words one at a time (hidden input)
   - Never paste the full phrase
   - The script clears memory after use

2. **Verification**
   - Script will check your balance
   - Confirms tokens are accessible
   - Creates immediate backup

### After Setup:
1. **Clean Up**
   ```bash
   # Clear bash history
   history -c
   
   # Clear terminal buffer
   clear && printf '\033[3J'
   ```

2. **Backup Storage**
   - Encrypted backups in `~/.rgb-lightcat/backups/`
   - Store copies in multiple secure locations
   - Test restore procedure

## Production Deployment Path

### Step 1: Complete Testing with Mock
- ✅ Supabase connected
- ✅ BTCPay configured
- ✅ Platform fully functional
- ✅ All tests passing

### Step 2: Deploy to VPS
- Get production server
- Run deployment scripts
- Configure domain & SSL

### Step 3: Import Real Seed
- SSH to production server
- Run `setup-rgb-wallet.sh`
- Enter seed phrase securely
- Verify balance

### Step 4: Go Live
- Switch off mock mode
- Enable production RGB
- Monitor first transactions

## Quick Commands

### Check Current Mode:
```bash
# See if using mock or real RGB
grep "USE_MOCK_RGB" .env
```

### Test Mock Setup:
```bash
# Generate test invoice
~/.rgb-lightcat-mock/generate-invoice.sh

# Check mock balance
cat ~/.rgb-lightcat-mock/balance.json
```

### Monitor RGB Service:
```bash
# View logs (when real RGB is running)
sudo journalctl -u rgb-lightcat -f

# Check service status
sudo systemctl status rgb-lightcat
```

## Emergency Procedures

### If Seed Compromised:
1. Immediately transfer all tokens to new wallet
2. Disable RGB service
3. Update all configurations
4. Notify users if necessary

### If Balance Shows Zero:
1. Check wallet sync status
2. Verify correct network (mainnet)
3. Restore from backup
4. Contact RGB support

## Support Resources

- RGB Documentation: https://rgb.tech
- LIGHTCAT Support: support@lightcat.io
- Emergency: security@lightcat.io

---

## ✅ Current Status

- Supabase: **Connected** ✅
- BTCPay: **Configured** ✅
- RGB Mode: **Mock (Safe for testing)** ✅
- Ready for: **Domain setup & deployment**

## 🚀 Next Steps

1. **Now**: Continue with mock RGB
2. **Next**: Set up production domain
3. **Then**: Deploy to VPS
4. **Finally**: Import real seed on production server

---

**Remember**: There's no rush to import your seed phrase. Test everything thoroughly with mock data first!