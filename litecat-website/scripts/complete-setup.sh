#!/bin/bash

# LIGHTCAT Complete Setup Script
# This script sets up everything needed for the LIGHTCAT platform

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# ASCII Art
echo -e "${YELLOW}"
cat << "EOF"
  _     ___ _____ _____ ____    _  _____ 
 | |   |_ _|_   _| ____|/ ___|  / \|_   _|
 | |    | |  | | |  _| | |     / _ \ | |  
 | |___ | |  | | | |___| |___ / ___ \| |  
 |_____|___| |_| |_____|\____/_/   \_\_|  
                                          
    🐱⚡ RGB Protocol Token Platform ⚡🐱
EOF
echo -e "${NC}"

echo -e "${BLUE}Starting Complete LIGHTCAT Setup...${NC}"
echo ""

# Check if running in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in the litecat-website directory${NC}"
    echo "Please run this script from the litecat-website directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check system requirements
echo -e "${BLUE}📋 Step 1: Checking system requirements...${NC}"

MISSING_DEPS=()

if ! command_exists node; then
    MISSING_DEPS+=("nodejs")
fi

if ! command_exists npm; then
    MISSING_DEPS+=("npm")
fi

if ! command_exists git; then
    MISSING_DEPS+=("git")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing dependencies: ${MISSING_DEPS[*]}${NC}"
    echo "Installing missing dependencies..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y nodejs npm git
        elif command_exists yum; then
            sudo yum install -y nodejs npm git
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac OSX
        if command_exists brew; then
            brew install node git
        else
            echo -e "${RED}Please install Homebrew first: https://brew.sh${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Unsupported OS. Please install Node.js manually.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ System requirements satisfied${NC}"

# Step 2: Install Node.js dependencies
echo ""
echo -e "${BLUE}📦 Step 2: Installing Node.js dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${YELLOW}Dependencies already installed. Updating...${NC}"
    npm update
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 3: Set up environment variables
echo ""
echo -e "${BLUE}🔐 Step 3: Setting up environment variables...${NC}"

if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:8082

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# Bitcoin Configuration
BTC_WALLET_ADDRESS=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh

# RGB Configuration
RGB_NODE_URL=http://localhost:8094
RGB_NETWORK=mainnet
RGB_MOCK_MODE=true

# Lightning Configuration (Voltage)
VOLTAGE_NODE_URL=
LIGHTNING_MACAROON_PATH=./voltage-credentials/admin.macaroon
LIGHTNING_TLS_CERT_PATH=./voltage-credentials/tls.cert

# Email Configuration (SendGrid)
SENDGRID_API_KEY=
EMAIL_FROM=noreply@lightcat.io

# Security
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "dev-secret-change-in-production")
ADMIN_API_KEY=$(openssl rand -base64 32 2>/dev/null || echo "dev-admin-key")

# Redis (optional)
REDIS_URL=redis://localhost:6379
EOF
    echo -e "${GREEN}✅ Created .env file${NC}"
else
    echo -e "${YELLOW}.env file already exists${NC}"
fi

# Step 4: Set up database
echo ""
echo -e "${BLUE}🗄️  Step 4: Setting up database...${NC}"

# Create database directory if it doesn't exist
mkdir -p database

# Check if Supabase is configured
if grep -q "your_supabase_url" .env; then
    echo -e "${YELLOW}⚠️  Supabase not configured${NC}"
    echo "To set up Supabase:"
    echo "1. Create account at https://supabase.com"
    echo "2. Create new project"
    echo "3. Update .env with your credentials"
    echo ""
    echo "For now, the app will use local mock data."
else
    echo -e "${GREEN}✅ Supabase configured${NC}"
fi

# Step 5: Create necessary directories
echo ""
echo -e "${BLUE}📁 Step 5: Creating directory structure...${NC}"

directories=(
    "server/logs"
    "server/uploads"
    "voltage-credentials"
    "rgb-credentials"
    "client/uploads"
    "temp"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
    echo "Created: $dir"
done

echo -e "${GREEN}✅ Directory structure created${NC}"

# Step 6: Configure SSL certificates (development)
echo ""
echo -e "${BLUE}🔒 Step 6: Setting up SSL certificates...${NC}"

if [ ! -f "server/certs/localhost.pem" ]; then
    mkdir -p server/certs
    echo "Generating self-signed certificate for development..."
    openssl req -x509 -newkey rsa:4096 -keyout server/certs/localhost-key.pem \
        -out server/certs/localhost.pem -days 365 -nodes -subj "/CN=localhost" 2>/dev/null
    echo -e "${GREEN}✅ SSL certificates generated${NC}"
else
    echo -e "${YELLOW}SSL certificates already exist${NC}"
fi

# Step 7: Set up Git hooks
echo ""
echo -e "${BLUE}🪝 Step 7: Setting up Git hooks...${NC}"

if [ -d ".git" ]; then
    # Pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run linting before commit
npm run lint
EOF
    chmod +x .git/hooks/pre-commit
    echo -e "${GREEN}✅ Git hooks configured${NC}"
else
    echo -e "${YELLOW}Not a git repository. Skipping hooks.${NC}"
fi

# Step 8: Initialize mock data
echo ""
echo -e "${BLUE}📊 Step 8: Initializing mock data...${NC}"

# Create mock RGB wallet data
if [ ! -f "rgb-credentials/mock-wallet.json" ]; then
    cat > rgb-credentials/mock-wallet.json << 'EOF'
{
  "assetId": "rgb1qw508d6qejxtdg4y5r3zarvary0c5xw7k",
  "network": "mainnet",
  "mockMode": true,
  "totalSupply": 21000000,
  "tokensPerBatch": 700,
  "pricePerBatch": 2000
}
EOF
    echo -e "${GREEN}✅ Mock RGB data created${NC}"
fi

# Step 9: Check services
echo ""
echo -e "${BLUE}🔍 Step 9: Checking services...${NC}"

# Function to check if port is in use
port_in_use() {
    netstat -an 2>/dev/null | grep -q ":$1 " || lsof -i :$1 >/dev/null 2>&1
}

if port_in_use 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use${NC}"
    echo "API server may already be running"
else
    echo -e "${GREEN}✅ Port 3000 is available${NC}"
fi

if port_in_use 8082; then
    echo -e "${YELLOW}⚠️  Port 8082 is already in use${NC}"
    echo "UI server may already be running"
else
    echo -e "${GREEN}✅ Port 8082 is available${NC}"
fi

# Step 10: Generate summary
echo ""
echo -e "${PURPLE}📋 Setup Summary${NC}"
echo "=================="
echo -e "✅ Dependencies installed"
echo -e "✅ Environment configured"
echo -e "✅ Directory structure created"
echo -e "✅ SSL certificates generated"
echo -e "✅ Mock data initialized"
echo ""

# Display next steps
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo ""
echo "1. Start the development servers:"
echo -e "   ${GREEN}npm run dev${NC}"
echo ""
echo "2. Access the application:"
echo -e "   - UI: ${GREEN}http://localhost:8082${NC}"
echo -e "   - API: ${GREEN}http://localhost:3000${NC}"
echo ""
echo "3. Configure production services:"
echo -e "   - Supabase: Update .env with credentials"
echo -e "   - Lightning: Run ${GREEN}./scripts/setup-voltage.sh${NC}"
echo -e "   - RGB Node: Run ${GREEN}./scripts/install-rgb-node.sh${NC}"
echo -e "   - Email: Add SendGrid API key to .env"
echo ""
echo "4. Test the setup:"
echo -e "   ${GREEN}npm test${NC}"
echo ""
echo "5. For production deployment:"
echo -e "   ${GREEN}./scripts/deploy-to-vps.sh${NC}"
echo ""

# Optional: Start services
echo -e "${YELLOW}Would you like to start the development servers now? (y/n)${NC}"
read -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Starting servers...${NC}"
    npm run dev
fi

echo ""
echo -e "${GREEN}🎉 Setup complete! Happy coding!${NC}"
echo -e "${YELLOW}🐱⚡ LIGHTCAT is ready to launch! ⚡🐱${NC}"