#!/bin/bash

# LIGHTCAT Smoke Test Script
# Quick validation of critical paths

echo "🚀 LIGHTCAT Smoke Test Starting..."
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $name... "
    
    if curl -s "$url" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
    fi
}

# Function to test POST endpoint
test_post_endpoint() {
    local name=$1
    local url=$2
    local data=$3
    local expected=$4
    
    echo -n "Testing $name... "
    
    response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "$data")
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        echo "  Response: $response"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $response"
        ((FAILED++))
    fi
}

echo ""
echo "1️⃣ Testing Server Status"
echo "-------------------------"
test_endpoint "UI Server" "http://localhost:8082/" "RGBLightCat"
test_endpoint "API Health" "http://localhost:3000/health" "ok"

echo ""
echo "2️⃣ Testing API Endpoints"
echo "-------------------------"
test_endpoint "RGB Stats" "http://localhost:3000/api/rgb/stats" "batchesSold"

echo ""
echo "3️⃣ Testing RGB Invoice Creation"
echo "---------------------------------"
test_post_endpoint "Create Invoice" \
    "http://localhost:3000/api/rgb/invoice" \
    '{"rgbInvoice": "rgb:utxob:test123", "batchCount": 1}' \
    "lightningInvoice"

echo ""
echo "4️⃣ Testing Static Assets"
echo "-------------------------"
test_endpoint "Game HTML" "http://localhost:8082/game.html" "ProGame.js"
test_endpoint "Logo Image" "http://localhost:8082/logo.jpg" ""
test_endpoint "Professional CSS" "http://localhost:8082/styles/professional.css" "mobile-first"

echo ""
echo "5️⃣ Testing Game Assets"
echo "-----------------------"
test_endpoint "Game JS" "http://localhost:8082/js/game/ProGame.js" "Three"
test_endpoint "Main Game" "http://localhost:8082/js/game/main.js" "LightcatGame"

echo ""
echo "================================"
echo "Test Summary:"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All smoke tests passed! System is operational.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the failures above.${NC}"
    exit 1
fi