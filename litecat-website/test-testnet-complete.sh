#!/bin/bash

echo "🧪 RGB Testnet Complete Test Suite"
echo "=================================="
echo ""

API_URL="https://rgblightcat.com"
PASS=0
FAIL=0

# Function to run test
run_test() {
    local name=$1
    local cmd=$2
    local expected=$3
    
    echo -n "$name: "
    
    RESULT=$(eval "$cmd" 2>/dev/null)
    
    if echo "$RESULT" | grep -q "$expected"; then
        echo "✅ PASS"
        ((PASS++))
        return 0
    else
        echo "❌ FAIL"
        echo "  Expected: $expected"
        echo "  Got: ${RESULT:0:100}..."
        ((FAIL++))
        return 1
    fi
}

# Test 1: Health check
run_test "API Health" \
    "curl -s $API_URL/health" \
    "ok"

# Test 2: Invalid invoice rejection
run_test "Invalid Invoice Rejection" \
    "curl -s -X POST $API_URL/api/rgb/invoice -H 'Content-Type: application/json' -d '{\"rgbInvoice\":\"bad\",\"batchCount\":1}'" \
    "error"

# Test 3: Valid testnet invoice
TESTNET_INVOICE="rgb:utxob:testnet$(date +%s)"
run_test "Valid Testnet Invoice" \
    "curl -s -X POST $API_URL/api/rgb/invoice -H 'Content-Type: application/json' -d '{\"rgbInvoice\":\"$TESTNET_INVOICE\",\"batchCount\":5}'" \
    "success"

# Extract invoice ID for next test
if [ $? -eq 0 ]; then
    INVOICE_ID=$(echo "$RESULT" | grep -o '"invoiceId":"[^"]*' | cut -d'"' -f4)
    echo "  Invoice ID: $INVOICE_ID"
    
    # Test 4: Payment status
    sleep 2
    run_test "Payment Status Check" \
        "curl -s $API_URL/api/rgb/invoice/$INVOICE_ID/status" \
        "status"
fi

# Test 5: RGB stats
run_test "RGB Stats Endpoint" \
    "curl -s $API_URL/api/rgb/stats" \
    "totalSupply"

# Test 6: Game integration
run_test "Game Score Submission" \
    "curl -s -X POST $API_URL/api/game/score -H 'Content-Type: application/json' -d '{\"walletAddress\":\"bc1qtest\",\"score\":30,\"tier\":\"gold\",\"maxBatches\":10}'" \
    "success"

echo ""
echo "=================================="
echo "Test Results: $PASS passed, $FAIL failed"
echo "=================================="

if [ $FAIL -eq 0 ]; then
    echo "✅ All tests passed! Testnet is ready!"
else
    echo "❌ Some tests failed. Please check the logs."
fi
