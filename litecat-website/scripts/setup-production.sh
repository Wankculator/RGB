#!/bin/bash

# LIGHTCAT Production Setup Script
# Following CLAUDE.md excellence standards

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 LIGHTCAT Production Setup"
echo "============================"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo "📋 Checking Prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js $(node -v)${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm $(npm -v)${NC}"
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}⚠️  PostgreSQL client not installed (needed for database setup)${NC}"
    else
        echo -e "${GREEN}✅ PostgreSQL client installed${NC}"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Git $(git --version)${NC}"
    
    echo ""
}

# Function to create directory structure
create_directories() {
    echo "📁 Creating Directory Structure..."
    
    # Create necessary directories
    mkdir -p server/logs
    mkdir -p server/uploads
    mkdir -p backups/database
    mkdir -p backups/configs
    mkdir -p ssl/certs
    mkdir -p .github/workflows
    
    # Set permissions
    chmod 755 server/logs
    chmod 755 server/uploads
    chmod 700 backups
    
    echo -e "${GREEN}✅ Directory structure created${NC}"
    echo ""
}

# Function to generate secure secrets
generate_secrets() {
    echo "🔐 Generating Secure Secrets..."
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    echo "JWT_SECRET=$JWT_SECRET" > .env.secrets
    
    # Generate admin password
    ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
    echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" >> .env.secrets
    
    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
    echo "DB_PASSWORD=$DB_PASSWORD" >> .env.secrets
    
    chmod 600 .env.secrets
    
    echo -e "${GREEN}✅ Secrets generated and saved to .env.secrets${NC}"
    echo -e "${YELLOW}⚠️  Keep .env.secrets secure and never commit to git!${NC}"
    echo ""
}

# Function to setup environment selection
select_environment() {
    echo "🌍 Select Environment:"
    echo "1) Testnet (Recommended for first setup)"
    echo "2) Mainnet (Production)"
    echo ""
    read -p "Enter choice [1-2]: " env_choice
    
    case $env_choice in
        1)
            ENVIRONMENT="testnet"
            NETWORK="testnet"
            echo -e "${GREEN}✅ Testnet environment selected${NC}"
            ;;
        2)
            ENVIRONMENT="mainnet"
            NETWORK="bitcoin"
            echo -e "${YELLOW}⚠️  Mainnet selected - ensure you understand the risks${NC}"
            ;;
        *)
            echo -e "${RED}Invalid choice. Defaulting to testnet.${NC}"
            ENVIRONMENT="testnet"
            NETWORK="testnet"
            ;;
    esac
    echo ""
}

# Function to create environment file
create_env_file() {
    echo "📝 Creating .env file..."
    
    cat > .env << EOF
# Environment
NODE_ENV=production
ENVIRONMENT=$ENVIRONMENT
NETWORK=$NETWORK

# Server Configuration
PORT=3000
CLIENT_URL=https://lightcat.xyz
API_BASE_URL=https://api.lightcat.xyz

# Database (Supabase) - CONFIGURE THESE
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here

# RGB Protocol - CRITICAL CONFIGURATION NEEDED
RGB_NODE_URL=http://localhost:50001
RGB_WALLET_PATH=/home/ubuntu/lightcat-wallet/wallet.dat
RGB_WALLET_PASSWORD=\${RGB_WALLET_PASSWORD}
RGB_ASSET_ID=rgb:xxxxxx-xxxxxx-xxxxxx
RGB_NETWORK=$NETWORK

# Lightning Network - CONFIGURE BASED ON YOUR SETUP
LIGHTNING_IMPLEMENTATION=LND
LIGHTNING_NODE_URL=https://localhost:8080
LIGHTNING_MACAROON_PATH=/home/ubuntu/.lnd/data/chain/bitcoin/$NETWORK/admin.macaroon
LIGHTNING_TLS_CERT_PATH=/home/ubuntu/.lnd/tls.cert

# Security
JWT_SECRET=\${JWT_SECRET}
ADMIN_PASSWORD_HASH=\${ADMIN_PASSWORD_HASH}
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=100

# Email (Optional but recommended)
SENDGRID_API_KEY=your_sendgrid_key_here
EMAIL_FROM=noreply@lightcat.xyz
SUPPORT_EMAIL=support@lightcat.xyz

# Game Configuration
GAME_TIER_1_SCORE=11
GAME_TIER_2_SCORE=18
GAME_TIER_3_SCORE=28

# Token Configuration
TOTAL_SUPPLY=21000000
TOKENS_PER_BATCH=700
SATOSHIS_PER_BATCH=2000
MAX_BATCHES_TIER_1=5
MAX_BATCHES_TIER_2=8
MAX_BATCHES_TIER_3=10

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=info

# SSL/TLS
SSL_CERT_PATH=/etc/letsencrypt/live/lightcat.xyz/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/lightcat.xyz/privkey.pem
EOF

    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  You must configure the placeholder values!${NC}"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    create_directories
    generate_secrets
    select_environment
    create_env_file
    
    echo "🎉 Initial setup complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Configure values in .env file"
    echo "2. Set up Supabase database"
    echo "3. Install RGB node"
    echo "4. Set up Lightning node"
    echo "5. Run: npm install"
    echo "6. Run: npm run db:migrate"
    echo "7. Run: npm run build"
    echo ""
    echo "For detailed instructions, see PRODUCTION_SETUP_GUIDE.md"
}

# Run main function
main