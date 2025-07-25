#!/bin/bash
# Master RGB Deployment Script

echo "🚀 LIGHTCAT RGB Automatic Deployment"
echo "===================================="

# Copy service file
echo "Installing RGB automatic service..."
cp rgbAutomaticService.js /root/lightcat-api/server/services/ || {
    mkdir -p /root/lightcat-api/server/services
    cp rgbAutomaticService.js /root/lightcat-api/server/services/
}

# Run validation fix
echo "Applying validation fix..."
./fix-rgb-validation.sh

# Update environment
echo "Updating environment..."
if ! grep -q "RGB_AUTO_MODE" /root/lightcat-api/.env 2>/dev/null; then
    echo "" >> /root/lightcat-api/.env
    echo "# RGB Automatic Mode" >> /root/lightcat-api/.env
    echo "RGB_AUTO_MODE=true" >> /root/lightcat-api/.env
    echo "USE_MOCK_RGB=false" >> /root/lightcat-api/.env
    echo "RGB_NETWORK=testnet" >> /root/lightcat-api/.env
fi

# Test deployment
echo ""
echo "Testing deployment..."
sleep 3

# Test validation
if curl -s -X POST https://rgblightcat.com/api/rgb/invoice   -H "Content-Type: application/json"   -d '{"rgbInvoice": "invalid", "batchCount": 1}' | grep -q "error"; then
    echo "✅ Validation working!"
else
    echo "❌ Validation not working"
fi

# Test valid invoice
RESPONSE=$(curl -s -X POST https://rgblightcat.com/api/rgb/invoice   -H "Content-Type: application/json"   -d '{"rgbInvoice": "rgb:utxob:test", "batchCount": 1}')

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ Invoice creation working!"
else
    echo "❌ Invoice creation failed"
fi

echo ""
echo "===================================="
echo "✅ Deployment complete!"
echo "===================================="
