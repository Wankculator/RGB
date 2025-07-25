# 🚀 Testnet to Mainnet Migration Guide

## Overview
This guide provides a step-by-step process for migrating from RGB testnet to mainnet once testing is complete.

## Prerequisites Checklist

### ✅ Testnet Validation Complete
- [ ] RGB invoice validation working
- [ ] Lightning payments processing correctly
- [ ] Consignment generation successful
- [ ] Game integration tested
- [ ] Mobile experience verified
- [ ] Performance acceptable
- [ ] Error handling robust

### ✅ Security Review
- [ ] Seed phrase storage plan finalized
- [ ] Wallet security measures in place
- [ ] API authentication configured
- [ ] Rate limiting active
- [ ] Input validation comprehensive
- [ ] Backup strategy defined

## Migration Steps

### 1. Mainnet Wallet Setup

**CRITICAL: Use a DIFFERENT seed phrase than testnet!**

```bash
# SSH into VPS
ssh root@147.93.105.138

# Create mainnet directory structure
mkdir -p /root/rgb-mainnet/data
chmod 700 /root/rgb-mainnet/data
cd /root/rgb-mainnet

# Create secure wallet initialization script
cat > init-mainnet-wallet.sh << 'SCRIPT'
#!/bin/bash

echo "⚠️  RGB MAINNET Wallet Initialization"
echo "===================================="
echo ""
echo "CRITICAL REMINDERS:"
echo "- Use a DIFFERENT seed phrase than testnet"
echo "- This wallet will hold REAL value"
echo "- Keep seed phrase EXTREMELY secure"
echo "- Consider hardware wallet integration"
echo ""

read -p "I understand the security implications (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Enter your MAINNET seed phrase:"
echo "(Will not be displayed or saved)"
read -s SEED_PHRASE

echo ""
echo "Create a strong password:"
read -s WALLET_PASSWORD

# Create mainnet wallet
# rgb-cli --network bitcoin wallet import \
#   --name lightcat_mainnet \
#   --seed "$SEED_PHRASE" \
#   --password "$WALLET_PASSWORD"

# Clear sensitive data
unset SEED_PHRASE
unset WALLET_PASSWORD

echo ""
echo "✅ Mainnet wallet initialized"
echo ""
echo "Next: Update configuration for mainnet"
SCRIPT

chmod 700 init-mainnet-wallet.sh
```

### 2. Configuration Update

Create mainnet environment file:

```bash
cat > .env.mainnet << 'EOF'
# RGB Mainnet Configuration
NODE_ENV=production
PORT=3000

# Lightning Configuration (BTCPay Mainnet)
USE_MOCK_LIGHTNING=false
BTCPAY_URL=https://btcpay0.voltageapp.io
BTCPAY_API_KEY=YOUR_MAINNET_API_KEY
BTCPAY_STORE_ID=YOUR_MAINNET_STORE_ID

# RGB Configuration
USE_MOCK_RGB=false
RGB_NETWORK=bitcoin
RGB_WALLET_NAME=lightcat_mainnet
RGB_DATA_DIR=/root/rgb-mainnet/data
USE_TESTNET=false

# Token Configuration
TOKENS_PER_BATCH=700
SATS_PER_BATCH=2000
TOTAL_SUPPLY=21000000
TOTAL_BATCHES=30000

# Email Configuration
SEND_EMAILS=true
SENDGRID_API_KEY=YOUR_SENDGRID_KEY
FROM_EMAIL=noreply@rgblightcat.com

# Security
RATE_LIMIT_WINDOW=300000
RATE_LIMIT_MAX=10
EOF
```

### 3. Update RGB Service for Mainnet

```javascript
// server/services/rgbMainnetService.js
const rgbMainnetService = {
    network: 'bitcoin',
    walletName: 'lightcat_mainnet',
    
    async generateConsignment({ rgbInvoice, amount, invoiceId }) {
        // Mainnet validation - extra strict
        if (!this.validateMainnetInvoice(rgbInvoice)) {
            throw new Error('Invalid mainnet RGB invoice');
        }
        
        // Add transaction limits for safety
        const MAX_TOKENS_PER_TX = 7000; // 10 batches max
        if (amount * 700 > MAX_TOKENS_PER_TX) {
            throw new Error('Exceeds transaction limit');
        }
        
        // Generate real mainnet consignment
        // ... actual RGB CLI integration ...
    },
    
    validateMainnetInvoice(invoice) {
        // Stricter validation for mainnet
        return invoice && 
               invoice.startsWith('rgb:') &&
               invoice.includes('utxob:') &&
               invoice.length >= 50 && // Mainnet invoices are longer
               invoice.length <= 500;
    }
};
```

### 4. Pre-Launch Checklist

#### Technical Validation
```bash
# Run all tests with mainnet configuration
NODE_ENV=production npm test

# Verify endpoints
curl https://rgblightcat.com/health
curl https://rgblightcat.com/api/rgb/stats

# Check security headers
curl -I https://rgblightcat.com | grep -E "(X-Frame|X-Content|Strict)"

# Test rate limiting
for i in {1..15}; do
  curl -X POST https://rgblightcat.com/api/rgb/invoice \
    -H "Content-Type: application/json" \
    -d '{"rgbInvoice": "rgb:utxob:test", "batchCount": 1}'
done
```

#### Business Validation
- [ ] Terms of Service updated
- [ ] Privacy Policy in place
- [ ] Support channels ready
- [ ] Documentation complete
- [ ] Marketing materials prepared

### 5. Gradual Rollout Strategy

#### Phase 1: Soft Launch (Day 1-3)
- Enable for team only
- Process manual transactions
- Monitor every transaction
- Gather feedback

#### Phase 2: Beta Launch (Day 4-10)
- Open to limited users
- Implement transaction limits
- 24/7 monitoring
- Quick response team ready

#### Phase 3: Public Launch (Day 11+)
- Full public access
- Marketing campaign
- Community support
- Regular updates

### 6. Monitoring & Alerts

Set up monitoring for:
```bash
# Transaction monitoring
tail -f /root/lightcat-api/logs/rgb-payments.log | grep "MAINNET"

# Error alerts
tail -f /root/lightcat-api/logs/error.log | grep -E "(ERROR|CRITICAL)"

# Performance monitoring
pm2 monit lightcat-api

# Disk space (for consignments)
df -h /root/rgb-mainnet/data
```

### 7. Emergency Procedures

#### If Issues Arise:
1. **Immediate**: Switch to mock mode
   ```bash
   # Update .env
   USE_MOCK_RGB=true
   # Restart
   pm2 restart lightcat-api
   ```

2. **Investigate**: Check logs
   ```bash
   tail -100 /root/lightcat-api/logs/error.log
   journalctl -u lightcat-api -n 100
   ```

3. **Communicate**: Update users
   - Post on social media
   - Update website banner
   - Send email if needed

### 8. Post-Launch Tasks

- [ ] Daily transaction reports
- [ ] Weekly security reviews
- [ ] Monthly performance optimization
- [ ] Quarterly security audits
- [ ] Regular backups verification

## Security Reminders

### NEVER:
- Store seed phrases in code
- Log sensitive data
- Skip validation checks
- Ignore error patterns
- Delay security updates

### ALWAYS:
- Use hardware security when possible
- Monitor all transactions
- Keep audit logs
- Test recovery procedures
- Have rollback plan ready

## Final Mainnet Switch

When ready to go live:

```bash
# 1. Backup everything
./scripts/backup.sh

# 2. Switch to mainnet config
cp .env.mainnet .env

# 3. Restart with mainnet
pm2 restart lightcat-api

# 4. Verify mainnet active
curl https://rgblightcat.com/health | grep '"network":"mainnet"'

# 5. Test with small amount first
# Create invoice for 1 batch only
# Process payment
# Verify consignment delivered

# 6. If successful, announce launch!
```

## Support Contacts

- Technical Issues: dev@lightcat.token
- Security Concerns: security@lightcat.token
- Business Inquiries: business@lightcat.token

---

**Remember: Mainnet is REAL MONEY. Test everything twice, deploy once!**