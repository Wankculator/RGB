# 🚨 URGENT: RGB Invoice Validation Fix Required

## Critical Security Issue Identified

The production API at https://rgblightcat.com is currently accepting **ANY** string as a valid RGB invoice, including:
- `"invalid"` ❌
- `"utxob:test"` (missing rgb: prefix) ❌
- `"rgb:invalid"` (missing utxob:) ❌

This needs to be fixed immediately!

## Quick Fix Instructions

### 1. SSH into your VPS:
```bash
ssh root@147.93.105.138
```

### 2. Edit the API file:
```bash
cd /root/lightcat-api
nano enhanced-api.js
```

### 3. Find the invoice creation endpoint (around line 51):
Look for:
```javascript
app.post('/api/rgb/invoice', async (req, res) => {
  const { rgbInvoice, batchCount } = req.body;
  
  if (!rgbInvoice || !batchCount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
```

### 4. Add validation AFTER the missing fields check:
```javascript
  // ADD THIS VALIDATION
  // Validate RGB invoice format
  if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {
    return res.status(400).json({ error: 'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"' });
  }
```

### 5. Save and restart:
```bash
# Save the file (Ctrl+X, Y, Enter in nano)
# Restart the API
systemctl restart lightcat-api
```

### 6. Verify the fix:
```bash
# This should return an error:
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}'

# This should succeed:
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:test", "batchCount": 1}'
```

## Complete Fixed Code Section

Here's what the complete invoice endpoint should look like:

```javascript
// Create Lightning invoice
app.post('/api/rgb/invoice', async (req, res) => {
  const { rgbInvoice, batchCount } = req.body;
  
  if (!rgbInvoice || !batchCount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate RGB invoice format
  if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {
    return res.status(400).json({ error: 'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"' });
  }
  
  const amount = batchCount * 2000; // 2000 sats per batch
  const invoiceId = 'inv_' + Date.now();
  
  // ... rest of the code continues ...
```

## Why This Is Critical

1. **Security**: Without validation, users could submit invalid data that might break the RGB processing
2. **User Experience**: Invalid invoices will fail later in the process, wasting user's time
3. **Data Integrity**: Invalid formats could corrupt the database
4. **CLAUDE.md Compliance**: This validation is required by the project specifications

## Testing After Fix

Run this test script to verify all validation cases:

```bash
#!/bin/bash
# Save as test-validation.sh and run

echo "Testing RGB validation..."

# Should fail
curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}' | grep error

# Should fail
curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:invalid", "batchCount": 1}' | grep error

# Should succeed
curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:valid", "batchCount": 1}' | grep success
```

## Status: NEEDS IMMEDIATE ACTION

This validation fix is required before any real users start using the platform!