#!/bin/bash

# LIGHTCAT RGB Mock Setup Script
# For development/testing without real RGB node

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔐 LIGHTCAT RGB Mock Setup${NC}"
echo "================================"
echo ""
echo -e "${BLUE}This will configure mock RGB for testing${NC}"
echo ""

# Update .env to use mock RGB
ENV_FILE="$(dirname "$0")/../.env"

echo -e "${BLUE}📝 Updating .env configuration...${NC}"

# Ensure mock mode is enabled
sed -i 's/USE_MOCK_RGB=false/USE_MOCK_RGB=true/' "$ENV_FILE" 2>/dev/null || \
    sed -i '' 's/USE_MOCK_RGB=false/USE_MOCK_RGB=true/' "$ENV_FILE"

echo -e "${GREEN}✅ Mock RGB enabled${NC}"

# Create mock balance file
MOCK_DIR="$HOME/.rgb-lightcat-mock"
mkdir -p "$MOCK_DIR"

cat > "$MOCK_DIR/balance.json" << EOF
{
  "asset_id": "rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po",
  "name": "LIGHTCAT",
  "balance": 21000000,
  "spendable": 20000000,
  "allocated": 1000000,
  "last_updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "${GREEN}✅ Mock balance file created${NC}"

# Create test invoice generator
cat > "$MOCK_DIR/generate-invoice.sh" << 'EOF'
#!/bin/bash
# Generate test RGB invoice
RANDOM_PART=$(openssl rand -hex 16)
echo "rgb:utxob:2Kxhk4Gq-7koTTcPH-hFwgFGLH-CbM9DZ61-76ayPJdx-test$RANDOM_PART"
EOF

chmod +x "$MOCK_DIR/generate-invoice.sh"

echo ""
echo -e "${GREEN}🎉 MOCK RGB SETUP COMPLETE!${NC}"
echo "==============================="
echo ""
echo "Mock configuration:"
echo "- Balance: 21,000,000 LIGHTCAT"
echo "- Mock directory: $MOCK_DIR"
echo "- Test invoice generator: $MOCK_DIR/generate-invoice.sh"
echo ""
echo "Next steps:"
echo "1. Restart the server: npm run dev"
echo "2. Test payment flow with mock data"
echo "3. When ready for production, run: ./scripts/setup-rgb-wallet.sh"
echo ""
echo -e "${YELLOW}⚠️  This is for testing only!${NC}"
echo "Real RGB wallet setup required for production."