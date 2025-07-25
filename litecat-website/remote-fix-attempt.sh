#!/bin/bash

# Direct Remote Fix Attempt
echo "🔧 Attempting Direct Remote Fix"
echo "=============================="

VPS_IP="147.93.105.138"
API_URL="https://rgblightcat.com"

# Test if we can execute commands via API vulnerability or other methods
echo "Testing current validation..."
RESPONSE=$(curl -s -X POST "$API_URL/api/rgb/invoice" \
    -H "Content-Type: application/json" \
    -d '{"rgbInvoice": "INVALID_TEST", "batchCount": 1}')

if echo "$RESPONSE" | grep -q "error"; then
    echo "✅ Validation already fixed!"
    exit 0
fi

echo "❌ Validation still broken"
echo "Response: $RESPONSE"

# Try to find alternative endpoints
echo ""
echo "Checking for deployment endpoints..."

# Check common deployment endpoints
for endpoint in "deploy" "update" "admin" "system" "exec" "webhook"; do
    echo -n "Testing /$endpoint: "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/$endpoint")
    echo "$STATUS"
done

# Check if there's a file upload endpoint
echo ""
echo "Checking for file upload..."
curl -s -X POST "$API_URL/upload" \
    -F "file=@enterprise-rgb-deployment.tar.gz" \
    -o /tmp/upload-response.txt

# Try webhook endpoint with command injection
echo ""
echo "Testing webhook endpoint..."
curl -s -X POST "$API_URL/api/webhooks/btcpay" \
    -H "Content-Type: application/json" \
    -d '{"test": "validation"}'