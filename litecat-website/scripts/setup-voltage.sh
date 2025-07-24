#!/bin/bash

# LIGHTCAT - Voltage Lightning Node Setup Script

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⚡ LIGHTCAT Voltage Lightning Setup${NC}"
echo ""

# Create credentials directory
CREDS_DIR="voltage-credentials"
mkdir -p "$CREDS_DIR"

echo -e "${YELLOW}📋 Prerequisites:${NC}"
echo "1. A Voltage account (https://voltage.cloud)"
echo "2. A Lightning node created on Voltage"
echo "3. Downloaded admin.macaroon and tls.cert from Voltage dashboard"
echo ""

# Check if files already exist
if [[ -f "$CREDS_DIR/admin.macaroon" ]] && [[ -f "$CREDS_DIR/tls.cert" ]]; then
    echo -e "${GREEN}✅ Voltage credentials already configured!${NC}"
    echo ""
    read -p "Do you want to reconfigure? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

echo -e "${BLUE}📥 Setting up Voltage credentials...${NC}"
echo ""

# Instructions for getting credentials
echo -e "${YELLOW}To get your credentials from Voltage:${NC}"
echo "1. Log in to https://voltage.cloud"
echo "2. Go to your node dashboard"
echo "3. Click on 'Connect' or 'API Credentials'"
echo "4. Download both files:"
echo "   - admin.macaroon (authentication token)"
echo "   - tls.cert (TLS certificate)"
echo ""

# Wait for user to confirm
read -p "Press Enter when you have downloaded both files..."

# Help user locate files
echo ""
echo -e "${BLUE}🔍 Looking for credential files...${NC}"

# Common download locations
DOWNLOAD_PATHS=(
    "$HOME/Downloads"
    "$HOME/Desktop"
    "/mnt/c/Users/*/Downloads"
    "/mnt/c/Users/*/Desktop"
    "."
)

MACAROON_FOUND=""
CERT_FOUND=""

# Search for files
for path in "${DOWNLOAD_PATHS[@]}"; do
    # Find admin.macaroon
    if [[ -z "$MACAROON_FOUND" ]]; then
        MACAROON=$(find $path -name "admin.macaroon" -type f 2>/dev/null | head -n 1)
        if [[ -n "$MACAROON" ]]; then
            MACAROON_FOUND="$MACAROON"
            echo -e "${GREEN}✅ Found admin.macaroon: $MACAROON_FOUND${NC}"
        fi
    fi
    
    # Find tls.cert
    if [[ -z "$CERT_FOUND" ]]; then
        CERT=$(find $path -name "tls.cert" -type f 2>/dev/null | head -n 1)
        if [[ -n "$CERT" ]]; then
            CERT_FOUND="$CERT"
            echo -e "${GREEN}✅ Found tls.cert: $CERT_FOUND${NC}"
        fi
    fi
done

# If not found automatically, ask user
if [[ -z "$MACAROON_FOUND" ]]; then
    echo ""
    echo -e "${YELLOW}Could not find admin.macaroon automatically.${NC}"
    read -p "Please enter the full path to admin.macaroon: " MACAROON_FOUND
fi

if [[ -z "$CERT_FOUND" ]]; then
    echo ""
    echo -e "${YELLOW}Could not find tls.cert automatically.${NC}"
    read -p "Please enter the full path to tls.cert: " CERT_FOUND
fi

# Verify files exist
if [[ ! -f "$MACAROON_FOUND" ]]; then
    echo -e "${RED}❌ Error: admin.macaroon not found at: $MACAROON_FOUND${NC}"
    exit 1
fi

if [[ ! -f "$CERT_FOUND" ]]; then
    echo -e "${RED}❌ Error: tls.cert not found at: $CERT_FOUND${NC}"
    exit 1
fi

# Copy files to credentials directory
echo ""
echo -e "${BLUE}📁 Copying credentials...${NC}"
cp "$MACAROON_FOUND" "$CREDS_DIR/admin.macaroon"
cp "$CERT_FOUND" "$CREDS_DIR/tls.cert"

# Set proper permissions
chmod 600 "$CREDS_DIR/admin.macaroon"
chmod 600 "$CREDS_DIR/tls.cert"

echo -e "${GREEN}✅ Credentials copied successfully!${NC}"

# Get Voltage node URL
echo ""
echo -e "${BLUE}🌐 Configuring Voltage node URL...${NC}"
echo "Your Voltage node URL looks like: https://yournode.m.voltageapp.io:8080"
echo ""
read -p "Enter your Voltage node URL: " VOLTAGE_URL

# Update .env file
ENV_FILE=".env"
if [[ -f "$ENV_FILE" ]]; then
    # Backup existing .env
    cp "$ENV_FILE" "$ENV_FILE.backup"
    
    # Update or add Voltage configuration
    if grep -q "VOLTAGE_NODE_URL" "$ENV_FILE"; then
        sed -i "s|VOLTAGE_NODE_URL=.*|VOLTAGE_NODE_URL=$VOLTAGE_URL|" "$ENV_FILE"
    else
        echo "" >> "$ENV_FILE"
        echo "# Voltage Lightning Configuration" >> "$ENV_FILE"
        echo "VOLTAGE_NODE_URL=$VOLTAGE_URL" >> "$ENV_FILE"
    fi
    
    if grep -q "LIGHTNING_MACAROON_PATH" "$ENV_FILE"; then
        sed -i "s|LIGHTNING_MACAROON_PATH=.*|LIGHTNING_MACAROON_PATH=./voltage-credentials/admin.macaroon|" "$ENV_FILE"
    else
        echo "LIGHTNING_MACAROON_PATH=./voltage-credentials/admin.macaroon" >> "$ENV_FILE"
    fi
    
    if grep -q "LIGHTNING_TLS_CERT_PATH" "$ENV_FILE"; then
        sed -i "s|LIGHTNING_TLS_CERT_PATH=.*|LIGHTNING_TLS_CERT_PATH=./voltage-credentials/tls.cert|" "$ENV_FILE"
    else
        echo "LIGHTNING_TLS_CERT_PATH=./voltage-credentials/tls.cert" >> "$ENV_FILE"
    fi
else
    # Create new .env file
    cat > "$ENV_FILE" << EOF
# Voltage Lightning Configuration
VOLTAGE_NODE_URL=$VOLTAGE_URL
LIGHTNING_MACAROON_PATH=./voltage-credentials/admin.macaroon
LIGHTNING_TLS_CERT_PATH=./voltage-credentials/tls.cert
EOF
fi

echo -e "${GREEN}✅ Environment variables configured!${NC}"

# Test connection
echo ""
echo -e "${BLUE}🧪 Testing Voltage connection...${NC}"
if command -v node &> /dev/null; then
    node scripts/test-voltage-connection.js
else
    echo -e "${YELLOW}⚠️  Node.js not found. Run 'node scripts/test-voltage-connection.js' to test.${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}🎉 Voltage Lightning setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Configuration Summary:${NC}"
echo "- Credentials stored in: $CREDS_DIR/"
echo "- Node URL: $VOLTAGE_URL"
echo "- Environment configured in: .env"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "1. Restart your application to use the new configuration"
echo "2. Test invoice creation with a small amount"
echo "3. Monitor your Voltage dashboard for incoming payments"
echo ""
echo -e "${BLUE}💡 Useful Commands:${NC}"
echo "- Test connection: node scripts/test-voltage-connection.js"
echo "- View logs: pm2 logs lightcat-api"
echo "- Check node info: curl -X GET http://localhost:3000/api/lightning/info"
echo ""

# Add to .gitignore
if [[ -f .gitignore ]]; then
    if ! grep -q "voltage-credentials" .gitignore; then
        echo "" >> .gitignore
        echo "# Voltage Lightning credentials" >> .gitignore
        echo "voltage-credentials/" >> .gitignore
        echo "*.macaroon" >> .gitignore
        echo "*.cert" >> .gitignore
        echo -e "${GREEN}✅ Added voltage-credentials to .gitignore${NC}"
    fi
fi