# ⚡ Lightning Network Setup Status

**Date:** July 24, 2025  
**Status:** BTCPay Server Configured but API Key Invalid ⚠️

## Current Status

### ✅ What's Working:
1. **Enhanced API deployed** with BTCPay support
2. **Environment configured** for real payments (USE_MOCK_LIGHTNING=false)
3. **HTTPS enabled** - Secure payment processing ready
4. **API endpoints active** at https://rgblightcat.com/api/

### ❌ What Needs Fixing:
1. **BTCPay API Key** - Current key returns 401 Unauthorized
2. **Store access** - Need valid credentials from BTCPay dashboard
3. **Webhook setup** - For payment notifications

## BTCPay Server Details

**Server:** https://btcpay0.voltageapp.io  
**Store ID:** HNQsGSwdyQb8Vg3y6srogKjXCDXdARt9Q113N4urcUcG  
**Current API Key:** Invalid/Expired

## 🔧 How to Fix BTCPay Authentication

### Step 1: Get New API Key
1. **Login to BTCPay** at https://btcpay0.voltageapp.io
2. **Go to Account** → **Manage API Keys**
3. **Create new API key** with permissions:
   - View invoices
   - Create invoices
   - View store settings
   - Webhook management

### Step 2: Update Configuration
```bash
# SSH to server
ssh root@147.93.105.138

# Edit environment file
nano /var/www/rgblightcat/.env

# Update this line with new API key:
BTCPAY_API_KEY=your_new_api_key_here

# Restart API
systemctl restart lightcat-api
```

### Step 3: Test Connection
```bash
# Check API health
curl https://rgblightcat.com/api/health

# Create test invoice
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:test", "batchCount": 1}'
```

## Alternative: Use Mock Mode

If you don't have BTCPay access, enable mock mode:

```bash
# SSH to server
ssh root@147.93.105.138

# Edit .env
nano /var/www/rgblightcat/.env

# Change to:
USE_MOCK_LIGHTNING=true

# Restart
systemctl restart lightcat-api
```

## API Endpoints Available

### Lightning/BTCPay Endpoints:
- `POST /api/rgb/invoice` - Create Lightning invoice
- `GET /api/rgb/invoice/:id/status` - Check payment status
- `GET /api/rgb/stats` - Token sale statistics
- `GET /health` - API health check

### Request Format:
```javascript
// Create invoice
POST /api/rgb/invoice
{
  "rgbInvoice": "rgb:utxob:...",
  "batchCount": 5
}

// Response
{
  "success": true,
  "invoiceId": "inv_123456",
  "lightningInvoice": "lnbc10000...",
  "amount": 10000,
  "expiresAt": "2025-07-24T20:00:00Z"
}
```

## Testing Payment Flow

### With Mock Mode:
1. Invoices auto-settle after 10 seconds
2. Perfect for development/testing
3. No real Lightning node needed

### With Real BTCPay:
1. Creates real Lightning invoices
2. Accepts Bitcoin payments
3. Requires valid API credentials

## Quick Commands

### Check Current Mode:
```bash
ssh root@147.93.105.138 'grep USE_MOCK_LIGHTNING /var/www/rgblightcat/.env'
```

### Monitor API Logs:
```bash
ssh root@147.93.105.138 'journalctl -u lightcat-api -f'
```

### Test Invoice Creation:
```bash
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:test", "batchCount": 1}' | jq
```

## Next Steps

### Option 1: Fix BTCPay (Recommended)
1. Get new API key from BTCPay dashboard
2. Update .env file
3. Test real payment flow

### Option 2: Use Voltage Lightning
1. Set up Voltage node
2. Download credentials (admin.macaroon, tls.cert)
3. Configure voltage service

### Option 3: Continue with Mock
1. Enable USE_MOCK_LIGHTNING=true
2. Test full flow with mock payments
3. Switch to real when ready

## Summary

The Lightning infrastructure is **ready** but needs:
- ✅ Valid BTCPay API key
- OR
- ✅ Enable mock mode for testing

The API is live and waiting for valid credentials to process real Lightning payments!