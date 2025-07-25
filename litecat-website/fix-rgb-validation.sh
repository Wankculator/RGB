#!/bin/bash
# RGB Validation Fix Script

echo "Applying RGB validation fix..."

# Find API file
API_FILE=$(find /root -name "enhanced-api*.js" -type f | grep -v backup | head -1)

if [ -z "$API_FILE" ]; then
    echo "Error: Cannot find API file"
    exit 1
fi

echo "Found API: $API_FILE"

# Backup
cp "$API_FILE" "${API_FILE}.backup.$(date +%s)"

# Check if validation exists
if grep -q "rgbInvoice.startsWith" "$API_FILE"; then
    echo "Validation already present"
else
    # Add validation using Python for better string handling
    python3 << 'PYTHON'
import re

with open("'$API_FILE'", 'r') as f:
    content = f.read()

# Find the pattern and add validation
pattern = r'(if \(!rgbInvoice \|\| !batchCount\) \{[^}]+\})'
replacement = r'\1\n\n    // Validate RGB invoice format\n    if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {\n        return res.status(400).json({ error: 'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"' });\n    }'

new_content = re.sub(pattern, replacement, content)

with open("'$API_FILE'", 'w') as f:
    f.write(new_content)

print("Validation added successfully")
PYTHON
fi

# Restart service
systemctl restart lightcat-api || pm2 restart lightcat-api || pm2 restart all

echo "RGB validation fix applied!"
