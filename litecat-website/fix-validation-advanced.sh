#!/bin/bash

echo "🔧 Advanced RGB Validation Fix"
echo "=============================="

# Function to find API files
find_api_files() {
    find /root -type f -name "*.js" -path "*/lightcat-api/*" | \
    xargs grep -l "api/rgb/invoice" 2>/dev/null | \
    grep -v node_modules | \
    grep -v backup
}

# Function to fix validation
fix_validation() {
    local file="$1"
    local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    echo "Processing: $file"
    cp "$file" "$backup"
    echo "Backup created: $backup"
    
    # Use Python for reliable text processing
    python3 << PYTHON
import re

with open("$file", 'r') as f:
    content = f.read()

# Check if validation already exists
if "rgbInvoice.startsWith('rgb:')" in content:
    print("✓ Validation already present")
else:
    # Pattern to find the validation point
    pattern = r'(if\s*\(\s*!rgbInvoice\s*\|\|\s*!batchCount\s*\)\s*\{[^}]+\})'
    
    def add_validation(match):
        original = match.group(0)
        validation = '''
    
    // Validate RGB invoice format
    if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {
        return res.status(400).json({ 
            error: 'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"',
            code: 'INVALID_RGB_FORMAT'
        });
    }
    
    // Additional validation
    if (rgbInvoice.length < 20 || rgbInvoice.length > 500) {
        return res.status(400).json({ 
            error: 'RGB invoice length invalid',
            code: 'INVALID_RGB_LENGTH'
        });
    }'''
        return original + validation
    
    new_content = re.sub(pattern, add_validation, content, flags=re.DOTALL)
    
    if new_content != content:
        with open("$file", 'w') as f:
            f.write(new_content)
        print("✅ Validation added successfully")
    else:
        print("⚠️  Could not add validation automatically")
PYTHON
}

# Find and fix all API files
API_FILES=$(find_api_files)

if [ -z "$API_FILES" ]; then
    echo "❌ No API files found!"
    exit 1
fi

for file in $API_FILES; do
    fix_validation "$file"
done

# Restart services
echo "Restarting services..."
systemctl restart lightcat-api 2>/dev/null || \
pm2 restart lightcat-api 2>/dev/null || \
pm2 restart all 2>/dev/null || \
echo "⚠️  Please restart your API service manually"

echo "✅ Validation fix complete!"
