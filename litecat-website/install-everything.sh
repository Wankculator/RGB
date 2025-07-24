#!/bin/bash

# LIGHTCAT Complete Installation Script
# This script installs everything needed

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}"
cat << "EOF"
  _     ___ _____ _____ ____    _  _____ 
 | |   |_ _|_   _| ____|/ ___|  / \|_   _|
 | |    | |  | | |  _| | |     / _ \ | |  
 | |___ | |  | | | |___| |___ / ___ \| |  
 |_____|___| |_| |_____|\____/_/   \_\_|  
                                          
    Installing Everything for LIGHTCAT
         🐱⚡ Please wait... ⚡🐱
EOF
echo -e "${NC}"

# Step 1: Clean up any existing issues
echo -e "${BLUE}🧹 Step 1: Cleaning up...${NC}"
rm -f package-lock.json
rm -rf node_modules
echo -e "${GREEN}✅ Cleanup complete${NC}"

# Step 2: Create all necessary directories
echo -e "\n${BLUE}📁 Step 2: Creating directory structure...${NC}"
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
    ".git/hooks"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
done
echo -e "${GREEN}✅ All directories created${NC}"

# Step 3: Set up environment file with proper defaults
echo -e "\n${BLUE}🔐 Step 3: Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:8082

# Database Configuration (Supabase)
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_SERVICE_KEY=placeholder-service-key
SUPABASE_ANON_KEY=placeholder-anon-key

# Bitcoin Configuration
BTC_WALLET_ADDRESS=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
BTC_WALLET_XPUB=xpub-placeholder

# RGB Configuration
RGB_NODE_URL=http://localhost:8094
RGB_NETWORK=mainnet
RGB_MOCK_MODE=true
RGB_ASSET_ID=rgb1mockassetid123456789

# Lightning Configuration (Voltage)
VOLTAGE_NODE_URL=https://mock.voltage.cloud:8080
LIGHTNING_MACAROON_PATH=./voltage-credentials/admin.macaroon
LIGHTNING_TLS_CERT_PATH=./voltage-credentials/tls.cert

# Email Configuration (SendGrid)
SENDGRID_API_KEY=SG.mock-api-key
EMAIL_FROM=noreply@rgblightcat.com
EMAIL_FROM_NAME=LIGHTCAT

# Security
JWT_SECRET=dev-jwt-secret-$(openssl rand -hex 32 2>/dev/null || echo "fallback-secret")
ADMIN_API_KEY=dev-admin-key-$(openssl rand -hex 32 2>/dev/null || echo "fallback-key")

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Payment Configuration
COINPAYMENTS_PUBLIC_KEY=mock-public-key
COINPAYMENTS_PRIVATE_KEY=mock-private-key
COINPAYMENTS_MERCHANT_ID=mock-merchant-id
COINPAYMENTS_IPN_SECRET=mock-ipn-secret

# Monitoring
LOG_LEVEL=info
EOF
    echo -e "${GREEN}✅ Environment file created${NC}"
else
    echo -e "${YELLOW}⚠️  .env already exists, preserving it${NC}"
fi

# Step 4: Create SSL certificates
echo -e "\n${BLUE}🔒 Step 4: Creating SSL certificates...${NC}"
if [ ! -f "server/certs/localhost.pem" ]; then
    openssl req -x509 -newkey rsa:2048 \
        -keyout server/certs/localhost-key.pem \
        -out server/certs/localhost.pem \
        -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=LIGHTCAT/CN=localhost" 2>/dev/null
    echo -e "${GREEN}✅ SSL certificates created${NC}"
else
    echo -e "${YELLOW}⚠️  Certificates already exist${NC}"
fi

# Step 5: Create mock credential files
echo -e "\n${BLUE}🔑 Step 5: Creating mock credentials...${NC}"

# Mock RGB wallet
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

# Mock voltage credentials
touch voltage-credentials/.gitkeep
echo "mock-macaroon-content" > voltage-credentials/admin.macaroon.mock
echo "mock-cert-content" > voltage-credentials/tls.cert.mock

echo -e "${GREEN}✅ Mock credentials created${NC}"

# Step 6: Install Node.js dependencies
echo -e "\n${BLUE}📦 Step 6: Installing Node.js dependencies...${NC}"
echo "This may take a few minutes..."

# Create a minimal package.json if it's corrupted
if ! grep -q '"name"' package.json 2>/dev/null; then
    echo -e "${YELLOW}⚠️  package.json seems corrupted, recreating...${NC}"
    cat > package.json << 'EOF'
{
  "name": "litecat-rgb-token",
  "version": "1.0.0",
  "description": "LIGHTCAT - First cat meme token on RGB Protocol",
  "main": "server/app.js",
  "scripts": {
    "start": "node server/app.js",
    "dev": "npm-run-all --parallel dev:*",
    "dev:api": "nodemon server/app.js",
    "dev:ui": "cd client && python3 -m http.server 8082",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "winston": "^3.10.0",
    "express-rate-limit": "^6.10.0",
    "express-validator": "^7.0.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.0",
    "axios": "^1.5.0",
    "node-fetch": "^2.7.0",
    "@supabase/supabase-js": "^2.33.1",
    "nodemailer": "^6.9.3",
    "multer": "^1.4.5-lts.1",
    "socket.io": "^4.6.2",
    "redis": "^4.6.7",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.4",
    "eslint": "^8.48.0",
    "npm-run-all": "^4.1.5"
  }
}
EOF
fi

# Try to install dependencies with error handling
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --no-audit --no-fund 2>&1 | while read line; do
    if [[ $line == *"ERR!"* ]]; then
        echo -e "${RED}$line${NC}"
    elif [[ $line == *"WARN"* ]]; then
        echo -e "${YELLOW}$line${NC}"
    fi
done

# Check if installation succeeded
if [ -d "node_modules" ] && [ -f "node_modules/express/package.json" ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Some dependencies may be missing, but we'll continue${NC}"
fi

# Step 7: Set up additional files
echo -e "\n${BLUE}📝 Step 7: Creating additional files...${NC}"

# Create .gitignore if missing
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.env.production
*.log
logs/
*.macaroon
*.cert
voltage-credentials/
.DS_Store
dist/
build/
.vscode/
.idea/
*.swp
*.swo
*~
EOF
fi

# Create server start file if missing
if [ ! -f "server/app.js" ] && [ ! -f "start-server.js" ]; then
    cat > start-server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'lightcat-api' });
});

// API routes placeholder
app.get('/api/rgb/stats', (req, res) => {
    res.json({
        success: true,
        stats: {
            totalSold: 1470000,
            batchesSold: 2100,
            remainingBatches: 27900,
            percentSold: 7
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`LIGHTCAT API running on port ${PORT}`);
});
EOF
fi

# Create start scripts
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting LIGHTCAT servers..."

# Kill any existing servers on our ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8082 | xargs kill -9 2>/dev/null

# Start API server
echo "Starting API server on port 3000..."
if [ -f "server/app.js" ]; then
    node server/app.js &
else
    node start-server.js &
fi
API_PID=$!

# Start UI server
echo "Starting UI server on port 8082..."
cd client && python3 -m http.server 8082 &
UI_PID=$!
cd ..

echo ""
echo "✅ LIGHTCAT is running!"
echo ""
echo "🌐 UI:  http://localhost:8082"
echo "🔌 API: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait and handle shutdown
trap "kill $API_PID $UI_PID 2>/dev/null; echo ''; echo '👋 LIGHTCAT servers stopped'; exit" INT
wait
EOF

chmod +x start.sh

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash
echo "Stopping LIGHTCAT servers..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8082 | xargs kill -9 2>/dev/null
pkill -f "node.*server" 2>/dev/null
pkill -f "python.*8082" 2>/dev/null
echo "✅ Servers stopped"
EOF

chmod +x stop.sh

echo -e "${GREEN}✅ Additional files created${NC}"

# Step 8: Final setup
echo -e "\n${BLUE}🎯 Step 8: Final configuration...${NC}"

# Create a test endpoint file if server directory exists
if [ -d "server" ] && [ ! -f "server/app.js" ]; then
    echo -e "${YELLOW}Creating minimal server/app.js...${NC}"
    cat > server/app.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'LIGHTCAT API is running' });
});

// RGB stats endpoint
app.get('/api/rgb/stats', (req, res) => {
    res.json({
        success: true,
        stats: {
            totalSold: 1470000,
            batchesSold: 2100,
            remainingBatches: 27900,
            uniqueBuyers: 420,
            percentSold: 7,
            mintClosed: false
        }
    });
});

// Lightning info endpoint
app.get('/api/lightning/info', (req, res) => {
    res.json({
        success: true,
        node: {
            alias: 'LIGHTCAT-MOCK',
            identity_pubkey: 'mock_pubkey_' + Date.now(),
            num_active_channels: 0,
            synced_to_chain: true,
            testnet: false,
            block_height: 820000
        },
        connected: false,
        mode: 'mock'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🐱⚡ LIGHTCAT API running on port ${PORT}`);
});

module.exports = app;
EOF
fi

echo -e "${GREEN}✅ Final configuration complete${NC}"

# Summary
echo -e "\n${PURPLE}===============================================${NC}"
echo -e "${GREEN}✅ INSTALLATION COMPLETE!${NC}"
echo -e "${PURPLE}===============================================${NC}"

echo -e "\n${BLUE}📋 Installation Summary:${NC}"
echo "• Directories created"
echo "• Environment configured"
echo "• SSL certificates generated"
echo "• Mock credentials created"
echo "• Dependencies installed (or attempted)"
echo "• Start scripts created"
echo "• Server files configured"

echo -e "\n${YELLOW}🚀 To start LIGHTCAT:${NC}"
echo -e "${GREEN}./start.sh${NC}"

echo -e "\n${YELLOW}📱 Access points:${NC}"
echo "• UI:  http://localhost:8082"
echo "• API: http://localhost:3000"

echo -e "\n${YELLOW}🛑 To stop servers:${NC}"
echo -e "${GREEN}./stop.sh${NC}"

echo -e "\n${PURPLE}🐱⚡ LIGHTCAT is ready! Have fun! ⚡🐱${NC}"

# Ask if user wants to start now
echo -e "\n${YELLOW}Would you like to start the servers now? (y/n)${NC}"
read -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./start.sh
fi