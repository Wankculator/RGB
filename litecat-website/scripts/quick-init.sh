#!/bin/bash

# LIGHTCAT Quick Initialization Script
# Sets up everything without npm install

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 LIGHTCAT Quick Initialization${NC}"
echo ""

# 1. Create directory structure
echo -e "${BLUE}📁 Creating directories...${NC}"
directories=(
    "server/logs"
    "server/uploads"
    "server/certs"
    "server/templates/email"
    "voltage-credentials"
    "rgb-credentials"
    "client/uploads"
    "database"
    "temp"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
done
echo -e "${GREEN}✅ Directories created${NC}"

# 2. Set up environment file
echo ""
echo -e "${BLUE}🔐 Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:8082

# Database Configuration (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key

# Bitcoin Configuration
BTC_WALLET_ADDRESS=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh

# RGB Configuration
RGB_NODE_URL=http://localhost:8094
RGB_NETWORK=mainnet
RGB_MOCK_MODE=true
RGB_ASSET_ID=mock-lightcat-asset-id

# Lightning Configuration (Voltage)
VOLTAGE_NODE_URL=
LIGHTNING_MACAROON_PATH=./voltage-credentials/admin.macaroon
LIGHTNING_TLS_CERT_PATH=./voltage-credentials/tls.cert

# Email Configuration (SendGrid)
SENDGRID_API_KEY=
EMAIL_FROM=noreply@rgblightcat.com
EMAIL_FROM_NAME=LIGHTCAT

# Security
JWT_SECRET=dev-secret-change-in-production-$(date +%s)
ADMIN_API_KEY=dev-admin-key-change-in-production-$(date +%s)

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Monitoring
LOG_LEVEL=info
EOF
    echo -e "${GREEN}✅ Created .env file${NC}"
else
    echo -e "${YELLOW}.env already exists${NC}"
fi

# 3. Create mock SSL certificates
echo ""
echo -e "${BLUE}🔒 Creating SSL certificates...${NC}"
if [ ! -f "server/certs/localhost.pem" ]; then
    openssl req -x509 -newkey rsa:4096 \
        -keyout server/certs/localhost-key.pem \
        -out server/certs/localhost.pem \
        -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=LIGHTCAT/CN=localhost" 2>/dev/null
    echo -e "${GREEN}✅ SSL certificates created${NC}"
else
    echo -e "${YELLOW}Certificates already exist${NC}"
fi

# 4. Create mock data files
echo ""
echo -e "${BLUE}📊 Creating mock data...${NC}"

# Mock RGB credentials
cat > rgb-credentials/mock-wallet.json << 'EOF'
{
  "assetId": "rgb1qw508d6qejxtdg4y5r3zarvary0c5xw7k",
  "network": "mainnet",
  "mockMode": true,
  "totalSupply": 21000000,
  "tokensPerBatch": 700,
  "pricePerBatch": 2000,
  "availableBatches": 30000
}
EOF

# Mock voltage credentials (for development)
touch voltage-credentials/.gitkeep

echo -e "${GREEN}✅ Mock data created${NC}"

# 5. Set up git ignore
echo ""
echo -e "${BLUE}📝 Updating .gitignore...${NC}"
if [ -f ".gitignore" ]; then
    # Add important entries if not present
    for entry in "voltage-credentials/" "*.macaroon" "*.cert" ".env" "node_modules/" "server/logs/"; do
        if ! grep -q "$entry" .gitignore; then
            echo "$entry" >> .gitignore
        fi
    done
    echo -e "${GREEN}✅ .gitignore updated${NC}"
fi

# 6. Create start scripts
echo ""
echo -e "${BLUE}🚀 Creating start scripts...${NC}"

# Create a simple start script
cat > start.sh << 'EOF'
#!/bin/bash
echo "Starting LIGHTCAT servers..."

# Start API server
echo "Starting API server on port 3000..."
node start-server.js &
API_PID=$!

# Start UI server
echo "Starting UI server on port 8082..."
cd client && python3 -m http.server 8082 &
UI_PID=$!

echo ""
echo "✅ Servers started!"
echo "API: http://localhost:3000"
echo "UI: http://localhost:8082"
echo ""
echo "Press Ctrl+C to stop servers"

# Wait for interrupt
trap "kill $API_PID $UI_PID; exit" INT
wait
EOF

chmod +x start.sh

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash
echo "Stopping LIGHTCAT servers..."
pkill -f "node.*start-server"
pkill -f "python.*http.server.*8082"
echo "✅ Servers stopped"
EOF

chmod +x stop.sh

echo -e "${GREEN}✅ Start scripts created${NC}"

# 7. Summary
echo ""
echo -e "${BLUE}==============================${NC}"
echo -e "${GREEN}✅ Quick Initialization Complete!${NC}"
echo -e "${BLUE}==============================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the servers:"
echo -e "   ${GREEN}./start.sh${NC}"
echo ""
echo "2. Access the application:"
echo -e "   UI: ${GREEN}http://localhost:8082${NC}"
echo -e "   API: ${GREEN}http://localhost:3000${NC}"
echo ""
echo "3. For full setup with dependencies:"
echo -e "   ${GREEN}npm install${NC} (when you have time)"
echo ""
echo "4. Configure production services:"
echo "   - Update .env with real credentials"
echo "   - Run ./scripts/setup-voltage.sh for Lightning"
echo "   - Run ./scripts/install-rgb-node.sh for RGB"
echo ""
echo -e "${YELLOW}🐱⚡ LIGHTCAT is ready to run! ⚡🐱${NC}"