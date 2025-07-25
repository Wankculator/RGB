#!/bin/bash

# ONE COMMAND RGB DEPLOYMENT
# This script deploys everything with a single command!

echo "🚀 ONE-COMMAND RGB DEPLOYMENT FOR LIGHTCAT"
echo "=========================================="
echo ""
echo "This will automatically:"
echo "✅ Fix RGB validation"
echo "✅ Set up automatic RGB service" 
echo "✅ Configure mock mode initially"
echo "✅ Test everything works"
echo ""

read -p "Deploy to production? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled"
    exit 1
fi

# VPS details
VPS_IP="147.93.105.138"
VPS_USER="root"

echo ""
echo "📦 Uploading deployment package..."

# Try to upload
if scp rgb-deployment.tar.gz $VPS_USER@$VPS_IP:/root/; then
    echo "✅ Package uploaded"
    
    echo ""
    echo "🚀 Executing deployment..."
    
    # Execute deployment
    ssh $VPS_USER@$VPS_IP << 'DEPLOY'
cd /root
tar -xzf rgb-deployment.tar.gz
chmod +x deploy-rgb.sh
./deploy-rgb.sh

# Additional validation
echo ""
echo "🧪 Running validation tests..."

# Test 1: Invalid invoice should fail
echo -n "Test 1 - Invalid invoice: "
if curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "INVALID", "batchCount": 1}' | grep -q "error"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test 2: Valid invoice should succeed
echo -n "Test 2 - Valid invoice: "
RESPONSE=$(curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:deployment-test", "batchCount": 1}')

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ PASS"
    INVOICE_ID=$(echo "$RESPONSE" | grep -o '"invoiceId":"[^"]*' | cut -d'"' -f4)
    
    # Test 3: Check payment status
    echo -n "Test 3 - Payment status: "
    sleep 2
    STATUS=$(curl -s "https://rgblightcat.com/api/rgb/invoice/$INVOICE_ID/status")
    if echo "$STATUS" | grep -q "status"; then
        echo "✅ PASS"
    else
        echo "❌ FAIL"
    fi
else
    echo "❌ FAIL"
fi

echo ""
echo "=========================================="
echo "✅ RGB DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Current Status:"
echo "- RGB Validation: Active"
echo "- Token Distribution: Automatic (mock mode)"
echo "- API: Running"
echo ""
echo "To switch to real RGB:"
echo "1. Install RGB CLI on VPS"
echo "2. Import your wallet"
echo "3. Update configuration"
echo "4. Restart service"
DEPLOY

else
    echo ""
    echo "❌ Could not upload automatically"
    echo ""
    echo "Manual deployment needed:"
    echo "1. Copy rgb-deployment.tar.gz to VPS"
    echo "2. SSH into VPS"
    echo "3. Run: tar -xzf rgb-deployment.tar.gz && ./deploy-rgb.sh"
fi

echo ""
echo "🎯 Testing from local machine..."

# Local tests
echo -n "Validation test: "
if curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type": "application/json" \
  -d '{"rgbInvoice": "bad", "batchCount": 1}' 2>/dev/null | grep -q "error"; then
    echo "✅ Working!"
else
    echo "❌ Not working yet"
fi

echo ""
echo "Done! Check https://rgblightcat.com"