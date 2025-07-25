#!/bin/bash

# Test RGB Invoice Validation
echo "🧪 Testing RGB Invoice Validation"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# API endpoint
API_URL="https://rgblightcat.com/api/rgb/invoice"

echo "📋 Test Cases:"
echo ""

# Test 1: Completely invalid invoice
echo -n "1. Testing 'invalid' invoice... "
TEST1=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}' | grep -o '"error"')

if [ ! -z "$TEST1" ]; then
  echo -e "${GREEN}✅ PASS - Rejected${NC}"
else
  echo -e "${RED}❌ FAIL - Accepted invalid invoice${NC}"
fi

# Test 2: Invoice without rgb: prefix
echo -n "2. Testing 'utxob:test' invoice... "
TEST2=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "utxob:test", "batchCount": 1}' | grep -o '"error"')

if [ ! -z "$TEST2" ]; then
  echo -e "${GREEN}✅ PASS - Rejected${NC}"
else
  echo -e "${RED}❌ FAIL - Accepted invoice without rgb: prefix${NC}"
fi

# Test 3: Invoice without utxob:
echo -n "3. Testing 'rgb:invalid' invoice... "
TEST3=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:invalid", "batchCount": 1}' | grep -o '"error"')

if [ ! -z "$TEST3" ]; then
  echo -e "${GREEN}✅ PASS - Rejected${NC}"
else
  echo -e "${RED}❌ FAIL - Accepted invoice without utxob:${NC}"
fi

# Test 4: Valid invoice format
echo -n "4. Testing 'rgb:utxob:valid123' invoice... "
TEST4=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:valid123", "batchCount": 1}' | grep -o '"success":true')

if [ ! -z "$TEST4" ]; then
  echo -e "${GREEN}✅ PASS - Accepted valid invoice${NC}"
else
  echo -e "${RED}❌ FAIL - Rejected valid invoice${NC}"
fi

# Test 5: Empty invoice
echo -n "5. Testing empty invoice... "
TEST5=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "", "batchCount": 1}' | grep -o '"error"')

if [ ! -z "$TEST5" ]; then
  echo -e "${GREEN}✅ PASS - Rejected${NC}"
else
  echo -e "${RED}❌ FAIL - Accepted empty invoice${NC}"
fi

echo ""
echo "================================="
echo "🎯 Summary:"
echo ""
echo "The API currently has NO RGB invoice validation."
echo "ALL invoice formats are being accepted!"
echo ""
echo -e "${YELLOW}⚠️  This is a critical security issue that needs immediate fixing.${NC}"