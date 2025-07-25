# 🚀 Automatic RGB Validation Fix Deployment

## Option 1: One-Line Remote Fix

Copy and paste this entire command:

```bash
ssh root@147.93.105.138 'cd /root/lightcat-api && cp enhanced-api.js enhanced-api.backup.js && sed -i "/if (!rgbInvoice || !batchCount) {/a\\    \n    // Validate RGB invoice format\n    if (!rgbInvoice.startsWith('\''rgb:'\'') || !rgbInvoice.includes('\''utxob:'\'')) {\n        return res.status(400).json({ error: '\''Invalid RGB invoice format. Must start with \"rgb:\" and contain \"utxob:\"'\'' });\n    }" enhanced-api.js && systemctl restart lightcat-api && echo "✅ RGB validation fix deployed!"'
```

## Option 2: Create Auto-Fix Script

Save this as `deploy-fix.sh` on your local machine:

```bash
#!/bin/bash

echo "🔧 Deploying RGB Validation Fix Automatically"
echo "==========================================="

VPS_IP="147.93.105.138"
VPS_USER="root"

# Create fix script
cat > /tmp/fix-rgb-validation.sh << 'EOF'
#!/bin/bash

# Backup current API
cp /root/lightcat-api/enhanced-api.js /root/lightcat-api/enhanced-api.backup.js

# Add validation after line containing "Missing required fields"
sed -i '/return res.status(400).json({ error: .Missing required fields. });/a\\n    // Validate RGB invoice format\n    if (!rgbInvoice.startsWith('\''rgb:'\'') || !rgbInvoice.includes('\''utxob:'\'')) {\n        return res.status(400).json({ error: '\''Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"'\'' });\n    }' /root/lightcat-api/enhanced-api.js

# Restart API
systemctl restart lightcat-api

echo "✅ RGB validation deployed!"
EOF

# Copy and execute on VPS
scp /tmp/fix-rgb-validation.sh $VPS_USER@$VPS_IP:/tmp/
ssh $VPS_USER@$VPS_IP 'chmod +x /tmp/fix-rgb-validation.sh && /tmp/fix-rgb-validation.sh'

# Test the fix
echo ""
echo "Testing validation..."
curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}' | grep -q "error" && echo "✅ Validation working!" || echo "❌ Validation not working"
```

## Option 3: Use Git Deployment

If your VPS has git access to your repo:

```bash
# On VPS
cd /root/lightcat-api
git pull origin main
systemctl restart lightcat-api
```

## Verification Test

After deployment, run this test:

```bash
# Should FAIL (return error)
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}'

# Should SUCCEED (return invoice)
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:valid", "batchCount": 1}'
```

Choose the option that works best for your setup!