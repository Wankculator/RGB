#!/bin/bash

# LIGHTCAT Payment Flow Test Script
echo "🧪 Testing LIGHTCAT Payment Flow"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Base URL
API_URL="https://rgblightcat.com/api"

# Test data
TEST_WALLET="bc1qtest$(date +%s)"
TEST_RGB_INVOICE="rgb:utxob:testinvoice$(date +%s)"

echo "📊 Step 1: Playing game and saving score..."
SCORE_RESPONSE=$(curl -s -X POST "$API_URL/game/score" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$TEST_WALLET\", \"score\": 30, \"tier\": \"gold\", \"maxBatches\": 10}")

if echo "$SCORE_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ Game score saved successfully${NC}"
  echo "$SCORE_RESPONSE" | python3 -m json.tool
else
  echo -e "${RED}❌ Failed to save game score${NC}"
  exit 1
fi

echo ""
echo "🎮 Step 2: Checking top scores..."
TOP_SCORES=$(curl -s "$API_URL/game/top-scores")
echo "$TOP_SCORES" | python3 -m json.tool

echo ""
echo "💳 Step 3: Creating Lightning invoice..."
INVOICE_RESPONSE=$(curl -s -X POST "$API_URL/rgb/invoice" \
  -H "Content-Type: application/json" \
  -d "{\"rgbInvoice\": \"$TEST_RGB_INVOICE\", \"batchCount\": 5}")

if echo "$INVOICE_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ Invoice created successfully${NC}"
  echo "$INVOICE_RESPONSE" | python3 -m json.tool
  
  # Extract invoice ID
  INVOICE_ID=$(echo "$INVOICE_RESPONSE" | grep -o '"invoiceId":"[^"]*' | cut -d'"' -f4)
  echo ""
  echo "Invoice ID: $INVOICE_ID"
else
  echo -e "${RED}❌ Failed to create invoice${NC}"
  echo "$INVOICE_RESPONSE"
  exit 1
fi

echo ""
echo "⏳ Step 4: Checking payment status..."
echo "(Waiting 5 seconds...)"
sleep 5

STATUS_RESPONSE=$(curl -s "$API_URL/rgb/invoice/$INVOICE_ID/status")
echo "$STATUS_RESPONSE" | python3 -m json.tool

# Check if using mock mode (auto-pays after 10 seconds)
if curl -s https://rgblightcat.com/health | grep -q '"mode":"mock"'; then
  echo ""
  echo -e "${YELLOW}ℹ️  Mock mode detected - invoice will auto-pay after 10 seconds${NC}"
  echo "Waiting 10 seconds..."
  sleep 10
  
  echo ""
  echo "📊 Step 5: Checking final payment status..."
  FINAL_STATUS=$(curl -s "$API_URL/rgb/invoice/$INVOICE_ID/status")
  echo "$FINAL_STATUS" | python3 -m json.tool
  
  if echo "$FINAL_STATUS" | grep -q '"status":"paid"'; then
    echo -e "${GREEN}✅ Payment completed (mock)${NC}"
    echo -e "${GREEN}✅ Consignment available${NC}"
  fi
else
  echo ""
  echo -e "${YELLOW}ℹ️  Live mode - Please pay the Lightning invoice${NC}"
  
  # Extract checkout URL if available
  CHECKOUT_URL=$(echo "$INVOICE_RESPONSE" | grep -o '"checkoutUrl":"[^"]*' | cut -d'"' -f4)
  if [ ! -z "$CHECKOUT_URL" ]; then
    echo "Payment URL: $CHECKOUT_URL"
  fi
fi

echo ""
echo "📈 Step 6: Checking recent purchases..."
RECENT_PURCHASES=$(curl -s "$API_URL/purchases/recent")
echo "$RECENT_PURCHASES" | python3 -m json.tool

echo ""
echo "✅ Payment flow test complete!"
echo ""
echo "Summary:"
echo "- Wallet: $TEST_WALLET"
echo "- RGB Invoice: $TEST_RGB_INVOICE"
echo "- Invoice ID: $INVOICE_ID"
echo ""
echo "🎯 Next steps:"
echo "1. Visit https://rgblightcat.com to test the full UI"
echo "2. Play the game to unlock purchase tiers"
echo "3. Make a real purchase with Lightning"
echo "4. Download your RGB consignment file"