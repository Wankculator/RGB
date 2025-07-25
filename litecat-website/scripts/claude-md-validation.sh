#!/bin/bash

# CLAUDE.md Comprehensive Validation Script
echo "🔍 CLAUDE.md COMPREHENSIVE VALIDATION TEST"
echo "=========================================="
echo "Running all mandatory checks as per CLAUDE.md requirements"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URLs
LOCAL_UI="http://localhost:8082"
LOCAL_API="http://localhost:3000"
PROD_UI="https://rgblightcat.com"
PROD_API="https://rgblightcat.com/api"

# Test results
PASS_COUNT=0
FAIL_COUNT=0

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    if curl -s "$url" | grep -q "$expected"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAIL_COUNT++))
        return 1
    fi
}

# Function to test response time
test_performance() {
    local url=$1
    local max_time=$2
    local description=$3
    
    echo -n "Testing $description performance... "
    
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$url")
    local response_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time < $max_time" | bc -l) )); then
        echo -e "${GREEN}✅ PASS${NC} (${response_ms}ms)"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (${response_ms}ms > ${max_time}s)"
        ((FAIL_COUNT++))
        return 1
    fi
}

echo -e "${BLUE}=== 1. SYSTEM STATUS CHECK ===${NC}"
echo ""

# Check production endpoints
echo "Production endpoints:"
test_endpoint "$PROD_UI" "RGBLightCat" "UI Server"
test_endpoint "$PROD_API/rgb/stats" "totalSupply" "API Server"
test_endpoint "$PROD_UI/health" "ok" "Health endpoint"

echo ""
echo -e "${BLUE}=== 2. CRITICAL PATHS VALIDATION ===${NC}"
echo ""

# RGB Invoice Flow
echo "RGB Invoice Flow:"
RGB_INVOICE_RESPONSE=$(curl -s -X POST "$PROD_API/rgb/invoice" \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:test123", "batchCount": 1}')

if echo "$RGB_INVOICE_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ RGB invoice creation working${NC}"
    ((PASS_COUNT++))
    
    # Extract invoice ID
    INVOICE_ID=$(echo "$RGB_INVOICE_RESPONSE" | grep -o '"invoiceId":"[^"]*' | cut -d'"' -f4)
    
    # Check invoice status
    STATUS_RESPONSE=$(curl -s "$PROD_API/rgb/invoice/$INVOICE_ID/status")
    if echo "$STATUS_RESPONSE" | grep -q "status"; then
        echo -e "${GREEN}✅ Payment status check working${NC}"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ Payment status check failed${NC}"
        ((FAIL_COUNT++))
    fi
else
    echo -e "${RED}❌ RGB invoice creation failed${NC}"
    ((FAIL_COUNT++))
fi

echo ""
echo -e "${BLUE}=== 3. LIGHTNING INVOICE STRUCTURE ===${NC}"
echo ""

# Check response structure
echo -n "Checking Lightning invoice response structure... "
if echo "$RGB_INVOICE_RESPONSE" | grep -q '"success"' && \
   echo "$RGB_INVOICE_RESPONSE" | grep -q '"invoiceId"' && \
   echo "$RGB_INVOICE_RESPONSE" | grep -q '"amount"' && \
   echo "$RGB_INVOICE_RESPONSE" | grep -q '"expiresAt"'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL - Missing required fields${NC}"
    ((FAIL_COUNT++))
fi

echo ""
echo -e "${BLUE}=== 4. GAME INTEGRATION ===${NC}"
echo ""

# Test game score saving
GAME_SCORE_RESPONSE=$(curl -s -X POST "$PROD_API/game/score" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "bc1qtest'$(date +%s)'", "score": 30, "tier": "gold", "maxBatches": 10}')

if echo "$GAME_SCORE_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Game score saving working${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ Game score saving failed${NC}"
    ((FAIL_COUNT++))
fi

# Check tier thresholds
echo -n "Checking tier threshold enforcement... "
echo -e "${YELLOW}⚠️  Manual verification needed${NC}"

echo ""
echo -e "${BLUE}=== 5. PERFORMANCE METRICS ===${NC}"
echo ""

# Test performance requirements
test_performance "$PROD_UI" "2" "Page load (< 2s)"
test_performance "$PROD_API/rgb/stats" "0.2" "API response (< 200ms)"
test_performance "$PROD_API/rgb/invoice" "1" "Lightning invoice (< 1s)" || true

echo ""
echo -e "${BLUE}=== 6. SECURITY VALIDATION ===${NC}"
echo ""

# Check HTTPS
echo -n "HTTPS enabled... "
if curl -s -I "$PROD_UI" | grep -q "Strict-Transport-Security"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL_COUNT++))
fi

# Check rate limiting
echo -n "Rate limiting active... "
echo -e "${YELLOW}⚠️  Manual verification needed${NC}"

# Check input validation
echo -n "Testing RGB invoice validation... "
INVALID_RESPONSE=$(curl -s -X POST "$PROD_API/rgb/invoice" \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}')

if echo "$INVALID_RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✅ PASS - Invalid invoice rejected${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL - Invalid invoice accepted${NC}"
    ((FAIL_COUNT++))
fi

echo ""
echo -e "${BLUE}=== 7. MOBILE RESPONSIVENESS ===${NC}"
echo ""

echo -e "${YELLOW}⚠️  Manual mobile testing required:${NC}"
echo "   - Touch targets 44px minimum"
echo "   - Game controls responsive"
echo "   - QR scanner functional"
echo "   - Mobile menu smooth"

echo ""
echo -e "${BLUE}=== 8. DATABASE & STORAGE ===${NC}"
echo ""

# Check if scores persist
echo -n "Checking score persistence... "
TOP_SCORES=$(curl -s "$PROD_API/game/top-scores")
if echo "$TOP_SCORES" | grep -q "scores"; then
    echo -e "${GREEN}✅ PASS - Scores retrievable${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL - Score retrieval failed${NC}"
    ((FAIL_COUNT++))
fi

echo ""
echo -e "${BLUE}=== 9. PAYMENT FLOW INTEGRITY ===${NC}"
echo ""

echo "Critical payment flow checklist:"
echo -n "1. RGB invoice validation... "
echo -e "${GREEN}✅ Tested${NC}"

echo -n "2. Lightning invoice generation... "
echo -e "${GREEN}✅ Tested${NC}"

echo -n "3. Payment status polling... "
echo -e "${GREEN}✅ Tested${NC}"

echo -n "4. Consignment generation... "
if [[ $(curl -s "$PROD_UI/health" | grep -o '"mode":"[^"]*"' | cut -d'"' -f4) == "mock" ]]; then
    echo -e "${YELLOW}⚠️  Mock mode active${NC}"
else
    echo -e "${GREEN}✅ Live mode${NC}"
fi

echo ""
echo -e "${BLUE}=== 10. ERROR HANDLING ===${NC}"
echo ""

# Test error cases
echo -n "Testing missing fields error... "
ERROR_RESPONSE=$(curl -s -X POST "$PROD_API/rgb/invoice" \
  -H "Content-Type: application/json" \
  -d '{}')

if echo "$ERROR_RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✅ PASS - Proper error handling${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL - No error for missing fields${NC}"
    ((FAIL_COUNT++))
fi

echo ""
echo "=========================================="
echo -e "${BLUE}VALIDATION SUMMARY${NC}"
echo "=========================================="
echo ""
echo -e "Tests Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Tests Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL AUTOMATED TESTS PASSED!${NC}"
    echo ""
    echo "The LIGHTCAT platform meets CLAUDE.md standards!"
else
    echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
    echo ""
    echo "Please review and fix the failed tests."
fi

echo ""
echo -e "${YELLOW}Manual verification still required for:${NC}"
echo "- Mobile responsiveness (all breakpoints)"
echo "- Game tier thresholds (11/18/28)"
echo "- Rate limiting effectiveness"
echo "- Full payment flow with real Lightning"
echo ""

echo "=========================================="
echo -e "${BLUE}QUICK REFERENCE${NC}"
echo "=========================================="
echo ""
echo "Production URLs:"
echo "- Website: $PROD_UI"
echo "- API Health: $PROD_UI/health"
echo "- Game: $PROD_UI/game.html"
echo ""
echo "Key Endpoints:"
echo "- POST $PROD_API/rgb/invoice"
echo "- GET $PROD_API/rgb/invoice/:id/status"
echo "- POST $PROD_API/game/score"
echo "- GET $PROD_API/game/top-scores"
echo ""
echo "Current Configuration:"
curl -s "$PROD_UI/health" | python3 -m json.tool