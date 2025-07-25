#!/bin/bash

# Test RGB Testnet Flow - Following CLAUDE.md validation requirements
echo "🧪 Testing RGB Testnet Integration"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# API endpoint
API_URL="http://localhost:3000"

# Test data
TEST_WALLET="bc1qtestnet$(date +%s)"
TEST_RGB="rgb:utxob:testnet$(date +%s)"

echo "1. Checking health endpoint..."
HEALTH=$(curl -s "$API_URL/health")
echo "$HEALTH" | python3 -m json.tool

echo ""
echo "2. Testing RGB invoice validation..."
echo -n "  Invalid invoice: "
INVALID=$(curl -s -X POST "$API_URL/api/rgb/invoice" \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}')

if echo "$INVALID" | grep -q "error"; then
    echo -e "${GREEN}✅ Correctly rejected${NC}"
else
    echo -e "${RED}❌ Should have been rejected${NC}"
fi

echo -n "  Valid testnet invoice: "
VALID=$(curl -s -X POST "$API_URL/api/rgb/invoice" \
  -H "Content-Type: application/json" \
  -d "{\"rgbInvoice\": \"$TEST_RGB\", \"batchCount\": 5}")

if echo "$VALID" | grep -q "success"; then
    echo -e "${GREEN}✅ Accepted${NC}"
    INVOICE_ID=$(echo "$VALID" | grep -o '"invoiceId":"[^"]*' | cut -d'"' -f4)
    echo "  Invoice ID: $INVOICE_ID"
else
    echo -e "${RED}❌ Should have been accepted${NC}"
    echo "$VALID"
fi

echo ""
echo "3. Waiting for auto-payment (10 seconds)..."
sleep 11

echo ""
echo "4. Checking payment status..."
STATUS=$(curl -s "$API_URL/api/rgb/invoice/$INVOICE_ID/status")
echo "$STATUS" | python3 -m json.tool

if echo "$STATUS" | grep -q "delivered"; then
    echo -e "${GREEN}✅ Testnet consignment generated!${NC}"
else
    echo -e "${RED}❌ Consignment not generated${NC}"
fi

echo ""
echo "=================================="
echo "Testnet integration test complete!"
