# 🚨 DIRECT RGB VALIDATION FIX COMMANDS

## Copy and paste these commands ONE BY ONE on your VPS:

### 1. First, find your API file:
```bash
find /root -name "enhanced-api*.js" -type f | grep -v backup
```

### 2. Create the validation fix (copy this entire block):
```bash
cat > /tmp/add-validation.sh << 'EOF'
#!/bin/bash
API_FILE="$1"

if [ -z "$API_FILE" ]; then
    echo "Usage: $0 <api-file-path>"
    exit 1
fi

# Backup
cp "$API_FILE" "${API_FILE}.backup.$(date +%s)"

# Add validation using awk
awk '
/if \(!rgbInvoice \|\| !batchCount\)/ { found=1 }
found && /return res\.status\(400\)\.json\({ error: .Missing required fields. }\);/ {
    print $0
    print ""
    print "    // Validate RGB invoice format"
    print "    if (!rgbInvoice.startsWith('\''rgb:'\'') || !rgbInvoice.includes('\''utxob:'\'')) {"
    print "        return res.status(400).json({ error: '\''Invalid RGB invoice format. Must start with \"rgb:\" and contain \"utxob:\"'\'' });"
    print "    }"
    found=0
    next
}
{ print }
' "$API_FILE" > "$API_FILE.new"

mv "$API_FILE.new" "$API_FILE"
echo "✅ Validation added to $API_FILE"
EOF

chmod +x /tmp/add-validation.sh
```

### 3. Run the fix (replace path with your actual API file):
```bash
/tmp/add-validation.sh /root/lightcat-api/enhanced-api.js
```

### 4. Restart your service:
```bash
# Try these in order until one works:
systemctl restart lightcat-api
# OR
pm2 restart lightcat-api  
# OR
pm2 restart all
```

### 5. Test the fix:
```bash
# This should return an error:
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}'

# This should work:
curl -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:test", "batchCount": 1}'
```

## Alternative: Manual Edit

If the script doesn't work, manually edit your API file:

1. Open the file:
```bash
nano /root/lightcat-api/enhanced-api.js
```

2. Find this section:
```javascript
if (!rgbInvoice || !batchCount) {
    return res.status(400).json({ error: 'Missing required fields' });
}
```

3. Add this RIGHT AFTER it:
```javascript
// Validate RGB invoice format
if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {
    return res.status(400).json({ error: 'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"' });
}
```

4. Save (Ctrl+X, Y, Enter) and restart the service.

## Quick Test After Fix:

Run this test script:
```bash
echo "Testing RGB validation..."
if curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "BAD", "batchCount": 1}' | grep -q "error"; then
    echo "✅ Validation working!"
else
    echo "❌ Validation not working"
fi
```