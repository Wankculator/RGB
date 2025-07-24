# 🧪 Testnet & Pre-Production Checklist

## Current Status:
- **RGB Mode**: Mock (safe) ✅
- **Payment**: BTCPay (real Bitcoin) ⚠️
- **Database**: Supabase (production) ✅
- **Domain**: rgblightcat.com (live) ✅

## ⚠️ IMPORTANT: We're using REAL Bitcoin payments!

### Option 1: Test with Small Amounts (Recommended)
Since BTCPay is configured for mainnet:
1. Make a test purchase with 0.00001 BTC (~$1)
2. Verify payment flow works
3. Check database records
4. Confirm email delivery

### Option 2: Switch to BTCPay Testnet
```bash
# Update .env on server
ssh root@147.93.105.138

# Edit configuration
nano /var/www/rgblightcat/.env

# Add/Change:
BTCPAY_NETWORK=testnet
USE_TESTNET=true
```

## 📋 Pre-Production Tests:

### 1. Basic Functionality
- [ ] Site loads at https://rgblightcat.com
- [ ] Game loads and plays
- [ ] Score submission works
- [ ] Tier unlocking works

### 2. Payment Flow Test
```bash
# Test the payment flow
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "rgbInvoice": "rgb:utxob:test",
    "batchCount": 1,
    "walletAddress": "bc1qtest123"
  }'
```

### 3. Database Verification
- [ ] Game scores saved to Supabase
- [ ] Purchase records created
- [ ] Stats updating correctly

### 4. Security Tests
- [ ] Rate limiting working
- [ ] Invalid inputs rejected
- [ ] CORS configured properly

### 5. Performance Tests
- [ ] Page load < 3 seconds
- [ ] API response < 500ms
- [ ] Game runs at 60 FPS

## 🚀 Production Readiness Checklist:

### Before Going Live:
1. **Test Payment Flow**
   - Use testnet OR
   - Make small real payment test
   - Verify funds arrive in your wallet

2. **RGB Integration**
   - Import real seed phrase (on server)
   - Test token distribution
   - Verify consignment generation

3. **Security Hardening**
   ```bash
   # On server
   ssh root@147.93.105.138
   
   # Disable test endpoints
   nano /var/www/rgblightcat/.env
   # Set: ENABLE_TEST_ENDPOINTS=false
   
   # Restart
   pm2 restart all
   ```

4. **Monitoring Setup**
   ```bash
   # Install monitoring
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   ```

5. **Backup Configuration**
   ```bash
   # Daily backups
   crontab -e
   # Add: 0 3 * * * /root/backup-lightcat.sh
   ```

## 🎯 Quick Test Commands:

### Test from your computer:
```bash
# Check API health
curl https://rgblightcat.com/api/health

# Check stats
curl https://rgblightcat.com/api/stats

# Test game score submission
curl -X POST https://rgblightcat.com/api/game/score \
  -H "Content-Type: application/json" \
  -d '{"score": 25, "walletAddress": "bc1qtest"}'
```

## ⚡ Go-Live Steps:

1. **Complete all tests above**
2. **Switch RGB from mock to real**:
   ```bash
   ssh root@147.93.105.138
   cd /var/www/rgblightcat
   ./scripts/setup-rgb-wallet.sh
   ```
3. **Disable test mode**
4. **Announce launch**

## 🔴 STOP! Before real launch:
- [ ] Tested payment with small amount?
- [ ] Verified funds arrive in your wallet?
- [ ] RGB seed phrase imported?
- [ ] All security measures enabled?
- [ ] Backups configured?

**Only proceed to production after all tests pass!**