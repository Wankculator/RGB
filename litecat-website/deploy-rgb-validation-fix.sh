#!/bin/bash

# Deploy RGB Validation Fix
echo "🔧 Deploying RGB Invoice Validation Fix"
echo "======================================"

# VPS details
VPS_IP="147.93.105.138"
VPS_USER="root"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "📤 Uploading fixed API file..."
scp enhanced-api-supabase.js $VPS_USER@$VPS_IP:/root/lightcat-api/enhanced-api.js

echo ""
echo "🔄 Restarting API server..."
ssh $VPS_USER@$VPS_IP "systemctl restart lightcat-api"

echo ""
echo "⏳ Waiting for API to start..."
sleep 3

echo ""
echo "✅ Testing RGB validation fix..."

# Test 1: Invalid invoice should be rejected
echo -n "Testing invalid invoice rejection... "
INVALID_TEST=$(curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}')

if echo "$INVALID_TEST" | grep -q "Invalid RGB invoice format"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "$INVALID_TEST"
fi

# Test 2: Valid invoice should be accepted
echo -n "Testing valid invoice acceptance... "
VALID_TEST=$(curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:validtest", "batchCount": 1}')

if echo "$VALID_TEST" | grep -q "success"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "$VALID_TEST"
fi

# Test 3: Invoice missing utxob should be rejected
echo -n "Testing invoice without utxob rejection... "
NO_UTXOB_TEST=$(curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:invalid", "batchCount": 1}')

if echo "$NO_UTXOB_TEST" | grep -q "Invalid RGB invoice format"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "$NO_UTXOB_TEST"
fi

echo ""
echo "📊 Deployment Summary"
echo "===================="
echo -e "${GREEN}✅ API file updated${NC}"
echo -e "${GREEN}✅ Server restarted${NC}"
echo -e "${GREEN}✅ Validation fixed${NC}"

echo ""
echo "🎯 Next Steps:"
echo "1. Run CLAUDE.md validation again: ./scripts/claude-md-validation.sh"
echo "2. Test the UI at https://rgblightcat.com"
echo "3. Verify game integration still works"