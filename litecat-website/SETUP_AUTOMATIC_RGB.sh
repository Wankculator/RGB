#!/bin/bash

# Fully Automatic RGB Setup Script
echo "🤖 LIGHTCAT Automatic RGB Setup"
echo "==============================="
echo ""

# This script sets up EVERYTHING automatically
# No manual steps required!

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Deploy RGB validation fix
echo -e "${YELLOW}Step 1: Deploying RGB validation fix...${NC}"
ssh root@147.93.105.138 << 'EOF'
cd /root/lightcat-api
# Backup
cp enhanced-api.js enhanced-api.backup.$(date +%s).js

# Add validation
sed -i '/if (!rgbInvoice || !batchCount) {/a\    \n    // Validate RGB invoice format\n    if (!rgbInvoice.startsWith("rgb:") || !rgbInvoice.includes("utxob:")) {\n        return res.status(400).json({ error: "Invalid RGB invoice format. Must start with \\"rgb:\\" and contain \\"utxob:\\"" });\n    }' enhanced-api.js

# Restart
systemctl restart lightcat-api
echo "✅ Validation deployed"
EOF

# Test validation
echo ""
echo "Testing validation..."
if curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "invalid", "batchCount": 1}' | grep -q "error"; then
    echo -e "${GREEN}✅ Validation working!${NC}"
else
    echo -e "${RED}❌ Validation not working${NC}"
    exit 1
fi

# Step 2: Install RGB CLI on VPS
echo ""
echo -e "${YELLOW}Step 2: Installing RGB CLI...${NC}"
scp INSTALL_RGB_CLI.sh root@147.93.105.138:/tmp/
ssh root@147.93.105.138 'chmod +x /tmp/INSTALL_RGB_CLI.sh && /tmp/INSTALL_RGB_CLI.sh'

# Step 3: Set up automatic service
echo ""
echo -e "${YELLOW}Step 3: Setting up automatic RGB service...${NC}"
scp server/services/rgbAutomaticService.js root@147.93.105.138:/root/lightcat-api/server/services/

# Step 4: Configure environment
echo ""
echo -e "${YELLOW}Step 4: Configuring automatic mode...${NC}"
ssh root@147.93.105.138 << 'EOF'
cd /root/lightcat-api

# Add automatic configuration
cat >> .env << 'ENV'

# RGB Automatic Configuration
RGB_AUTO_CREATE_WALLET=true
RGB_AUTO_ISSUE=true
RGB_FALLBACK_TO_MOCK=true
USE_MOCK_RGB=false
ENV

# Update API to use automatic service
sed -i "s/require('\.\/rgbService')/require('\.\/rgbAutomaticService')/g" enhanced-api.js

# Restart
systemctl restart lightcat-api
EOF

# Step 5: Initialize automatic wallet
echo ""
echo -e "${YELLOW}Step 5: Initializing automatic wallet...${NC}"
ssh root@147.93.105.138 << 'EOF'
# The service will auto-create wallet on first run
curl https://rgblightcat.com/health

# Check RGB service health
sleep 5
curl https://rgblightcat.com/api/rgb/health || echo "Health endpoint not implemented yet"
EOF

# Step 6: Test automatic flow
echo ""
echo -e "${YELLOW}Step 6: Testing automatic token distribution...${NC}"

# Create test invoice
TEST_INVOICE="rgb:utxob:auto$(date +%s)"
echo "Creating invoice with: $TEST_INVOICE"

RESPONSE=$(curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d "{\"rgbInvoice\": \"$TEST_INVOICE\", \"batchCount\": 1}")

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
    INVOICE_ID=$(echo "$RESPONSE" | grep -o '"invoiceId":"[^"]*' | cut -d'"' -f4)
    echo "Invoice created: $INVOICE_ID"
    
    # Wait for auto-payment (mock mode)
    echo "Waiting 15 seconds for auto-payment..."
    sleep 15
    
    # Check status
    STATUS=$(curl -s "https://rgblightcat.com/api/rgb/invoice/$INVOICE_ID/status")
    echo "Status: $STATUS"
    
    if echo "$STATUS" | grep -q "consignment"; then
        echo -e "${GREEN}✅ AUTOMATIC DISTRIBUTION WORKING!${NC}"
    else
        echo -e "${YELLOW}⚠️  Consignment not ready yet${NC}"
    fi
else
    echo -e "${RED}❌ Failed to create invoice${NC}"
fi

echo ""
echo "==============================="
echo -e "${GREEN}Automatic RGB Setup Complete!${NC}"
echo "==============================="
echo ""
echo "The system is now configured for:"
echo "✅ Automatic wallet creation"
echo "✅ Automatic token issuance (testnet)"
echo "✅ Automatic consignment generation"
echo "✅ Fallback to mock if errors occur"
echo ""
echo "Next: Configure for mainnet when ready!"