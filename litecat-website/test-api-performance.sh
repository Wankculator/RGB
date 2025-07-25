#!/bin/bash

# Test API Performance
echo "⚡ Testing API Performance"
echo "========================="
echo ""

# Test endpoints with timing
echo "Testing individual endpoints:"
echo ""

# 1. Health check
echo -n "1. /health endpoint: "
time curl -s https://rgblightcat.com/health > /dev/null
echo ""

# 2. RGB stats
echo -n "2. /api/rgb/stats endpoint: "
time curl -s https://rgblightcat.com/api/rgb/stats > /dev/null
echo ""

# 3. Game top scores
echo -n "3. /api/game/top-scores endpoint: "
time curl -s https://rgblightcat.com/api/game/top-scores > /dev/null
echo ""

# 4. Create invoice (will fail due to validation)
echo -n "4. /api/rgb/invoice endpoint (POST): "
time curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "rgb:utxob:test", "batchCount": 1}' > /dev/null
echo ""

# Check server location
echo "Checking server response headers:"
curl -I -s https://rgblightcat.com/health | grep -E "(Server|X-|CF-)"

echo ""
echo "Notes:"
echo "- Response times over 200ms indicate performance issues"
echo "- Could be due to server location, resource constraints, or code inefficiency"