#!/bin/bash

# Full System Test for LIGHTCAT Platform

echo "🧪 LIGHTCAT Full System Test"
echo "============================"
echo ""

# Configuration
DOMAIN="rgblightcat.com"
VPS_IP="147.93.105.138"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local url=$1
    local expected=$2
    local description=$3
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✅ $description${NC}"
        return 0
    else
        echo -e "${RED}❌ $description (Got: $response, Expected: $expected)${NC}"
        return 1
    fi
}

# Test JSON endpoint
test_json() {
    local url=$1
    local field=$2
    local description=$3
    
    response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "\"$field\""; then
        echo -e "${GREEN}✅ $description${NC}"
        echo "   Response: $(echo $response | head -c 100)..."
        return 0
    else
        echo -e "${RED}❌ $description${NC}"
        echo "   Response: $response"
        return 1
    fi
}

echo "1️⃣ Testing DNS Resolution"
echo "========================="
if ping -c 1 "$DOMAIN" | grep -q "$VPS_IP"; then
    echo -e "${GREEN}✅ DNS is resolving to correct IP ($VPS_IP)${NC}"
else
    echo -e "${RED}❌ DNS not resolving correctly${NC}"
fi
echo ""

echo "2️⃣ Testing HTTP Endpoints"
echo "========================"
test_endpoint "http://$DOMAIN" "200" "HTTP Homepage accessible"
test_endpoint "http://$VPS_IP:8082" "200" "Direct IP client access"
test_endpoint "http://$VPS_IP:3000/api/health" "200" "Direct IP API access"
echo ""

echo "3️⃣ Testing HTTPS (if SSL is setup)"
echo "================================="
test_endpoint "https://$DOMAIN" "200" "HTTPS Homepage"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL Certificate is working!${NC}"
else
    echo -e "${YELLOW}⚠️  SSL not yet configured (run complete-ssl-setup.sh)${NC}"
fi
echo ""

echo "4️⃣ Testing API Endpoints"
echo "======================="
test_json "http://$DOMAIN/api/health" "status" "API Health Check"
test_json "http://$DOMAIN/api/stats" "tokens_sold" "Stats Endpoint"
test_json "http://$DOMAIN/api/rgb/stats" "totalBatches" "RGB Stats Endpoint"
echo ""

echo "5️⃣ Testing Game Functionality"
echo "============================"
# Test if game HTML loads
game_test=$(curl -s "http://$DOMAIN/game.html" 2>/dev/null | grep -c "game-canvas")
if [ $game_test -gt 0 ]; then
    echo -e "${GREEN}✅ Game HTML loads correctly${NC}"
else
    echo -e "${RED}❌ Game HTML not loading${NC}"
fi

# Test game assets
test_endpoint "http://$DOMAIN/js/game/ProGame.js" "200" "Game JavaScript loads"
test_endpoint "http://$DOMAIN/game/assets/space.jpg" "200" "Game assets accessible"
echo ""

echo "6️⃣ Testing Mock Payment Flow"
echo "==========================="
# Create test invoice
invoice_response=$(curl -s -X POST "http://$DOMAIN/api/rgb/invoice" \
    -H "Content-Type: application/json" \
    -d '{
        "rgbInvoice": "rgb:utxob:test-invoice",
        "batchCount": 1,
        "walletAddress": "bc1qtest123"
    }' 2>/dev/null)

if echo "$invoice_response" | grep -q "invoiceId"; then
    echo -e "${GREEN}✅ Mock invoice creation works${NC}"
    
    # Extract invoice ID
    invoice_id=$(echo "$invoice_response" | grep -o '"invoiceId":"[^"]*"' | cut -d'"' -f4)
    
    if [ ! -z "$invoice_id" ]; then
        # Test status check
        status_response=$(curl -s "http://$DOMAIN/api/rgb/invoice/$invoice_id/status" 2>/dev/null)
        if echo "$status_response" | grep -q "status"; then
            echo -e "${GREEN}✅ Invoice status check works${NC}"
        else
            echo -e "${RED}❌ Invoice status check failed${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Mock invoice creation failed${NC}"
    echo "   Response: $invoice_response"
fi
echo ""

echo "7️⃣ Testing Mobile Responsiveness"
echo "==============================="
# Check viewport meta tag
viewport_test=$(curl -s "http://$DOMAIN" 2>/dev/null | grep -c "viewport")
if [ $viewport_test -gt 0 ]; then
    echo -e "${GREEN}✅ Mobile viewport configured${NC}"
else
    echo -e "${YELLOW}⚠️  Mobile viewport may need configuration${NC}"
fi
echo ""

echo "8️⃣ Performance Tests"
echo "==================="
# Test response time
start_time=$(date +%s%N)
curl -s -o /dev/null "http://$DOMAIN"
end_time=$(date +%s%N)
response_time=$((($end_time - $start_time) / 1000000))

if [ $response_time -lt 2000 ]; then
    echo -e "${GREEN}✅ Homepage loads fast (${response_time}ms)${NC}"
else
    echo -e "${YELLOW}⚠️  Homepage load time: ${response_time}ms (target: <2000ms)${NC}"
fi

# API response time
start_time=$(date +%s%N)
curl -s -o /dev/null "http://$DOMAIN/api/stats"
end_time=$(date +%s%N)
api_time=$((($end_time - $start_time) / 1000000))

if [ $api_time -lt 200 ]; then
    echo -e "${GREEN}✅ API responds fast (${api_time}ms)${NC}"
else
    echo -e "${YELLOW}⚠️  API response time: ${api_time}ms (target: <200ms)${NC}"
fi
echo ""

echo "📊 Test Summary"
echo "=============="
echo ""
echo "🌐 Access your site at:"
echo "   http://$DOMAIN (HTTP)"
echo "   https://$DOMAIN (HTTPS - if SSL configured)"
echo ""
echo "📱 Test on mobile devices"
echo "🎮 Play the game to unlock tiers"
echo "💰 Test mock payment flow"
echo ""
echo "💡 Next Steps:"
echo "1. If SSL not working: Run ./complete-ssl-setup.sh"
echo "2. Enable mock mode: Run ./enable-full-mock.sh"
echo "3. Test everything thoroughly before going live"
echo "4. Import RGB seed phrase only after all tests pass"