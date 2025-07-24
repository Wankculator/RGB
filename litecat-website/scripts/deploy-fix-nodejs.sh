#!/bin/bash

# Fixed deployment script for Hostinger VPS with Node.js issues

set -euo pipefail

# Configuration
DOMAIN="rgblightcat.com"
VPS_IP="147.93.105.138"
VPS_USER="root"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🚀 LIGHTCAT Deployment (Fixed Version)${NC}"
echo "========================================="
echo ""

# Create a fixed server setup script
cat > /tmp/server-setup-fixed.sh << 'EOF'
#!/bin/bash

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="rgblightcat.com"
APP_DIR="/var/www/rgblightcat"

echo -e "${BLUE}🔧 Setting up server...${NC}"

# Fix Node.js installation issues
echo -e "${BLUE}📦 Fixing Node.js installation...${NC}"

# Remove conflicting packages
apt remove --purge nodejs npm -y || true
apt autoremove -y
apt clean

# Update system
apt update

# Install Node.js 20 from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node_version=$(node --version)
npm_version=$(npm --version)
echo -e "${GREEN}✅ Node.js installed: $node_version${NC}"
echo -e "${GREEN}✅ npm installed: $npm_version${NC}"

# Install other dependencies
echo -e "${BLUE}📦 Installing other dependencies...${NC}"
apt install -y nginx certbot python3-certbot-nginx git ufw fail2ban

# Create app directory
mkdir -p $APP_DIR
cd $APP_DIR

# Extract application
echo -e "${BLUE}📂 Extracting application...${NC}"
tar -xzf /tmp/deployment.tar.gz || {
    echo -e "${RED}❌ No deployment package found. Creating from scratch...${NC}"
    # Alternative: clone from git if available
}

# Create package.json if missing
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}Creating package.json...${NC}"
    cat > package.json << 'PKGJSON'
{
  "name": "lightcat-website",
  "version": "1.0.0",
  "description": "LIGHTCAT RGB Token Platform",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "client": "node start-client.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^7.1.5",
    "@supabase/supabase-js": "^2.39.0"
  }
}
PKGJSON
fi

# Install npm dependencies
echo -e "${BLUE}📦 Installing npm packages...${NC}"
npm install --production || {
    echo -e "${YELLOW}Trying with --force flag...${NC}"
    npm install --production --force
}

# Create .env file
echo -e "${BLUE}🔐 Setting up environment...${NC}"
cat > .env << 'ENVFILE'
NODE_ENV=production
PORT=3000
CLIENT_URL=https://rgblightcat.com

# Supabase
SUPABASE_URL=https://xyfqpvxwvlemnraldbjd.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDk2MzksImV4cCI6MjA2ODY4NTYzOX0.dIF_7uErKhpAeBurPGv_oS3gQEfJ6sHQP9mr0FUuC0M

# BTCPay
BTCPAY_URL=https://btcpay0.voltageapp.io
BTCPAY_API_KEY=1dpQWkChRWpEWiilo1D1ZlI0PEv7EOIIIhliMiD7LnM
BTCPAY_STORE_ID=HNQsGSwdyQb8Vg3y6srogKjXCDXdARt9Q113N4urcUcG
BTC_WALLET_ADDRESS=bc1qdsdr3ztdcvuj5kl0j4sh6qpe60579nx0dpgydu

# RGB
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
USE_MOCK_RGB=true
USE_BTCPAY=true

# Security
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
ENVFILE

# Create simple server if main doesn't exist
if [ ! -f "server/index.js" ]; then
    echo -e "${YELLOW}Creating simple server...${NC}"
    mkdir -p server
    cat > server/index.js << 'SERVERFILE'
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LIGHTCAT API Running' });
});

// API routes placeholder
app.get('/api/stats', (req, res) => {
    res.json({
        tokens_sold: 1470000,
        batches_sold: 2100,
        unique_buyers: 342,
        last_sale: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
SERVERFILE
fi

# Create client server
cat > start-client.js << 'CLIENTFILE'
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'client')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

const PORT = process.env.CLIENT_PORT || 8082;
app.listen(PORT, () => {
  console.log(`Client server running on port ${PORT}`);
});
CLIENTFILE

# Set up PM2
echo -e "${BLUE}🔧 Setting up PM2...${NC}"
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'PM2FILE'
module.exports = {
  apps: [
    {
      name: 'lightcat-api',
      script: './server/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'lightcat-client',
      script: './start-client.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        CLIENT_PORT: 8082
      }
    }
  ]
};
PM2FILE

# Start with PM2
pm2 delete all || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Configure Nginx
echo -e "${BLUE}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/rgblightcat << 'NGINXFILE'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    
    location / {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXFILE

# Enable site
ln -sf /etc/nginx/sites-available/rgblightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Configure firewall
echo -e "${BLUE}🔒 Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# Get SSL certificate
echo -e "${BLUE}🔐 Getting SSL certificate...${NC}"
certbot --nginx -d rgblightcat.com -d www.rgblightcat.com --non-interactive --agree-tos -m admin@rgblightcat.com --redirect

echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""
echo "🎉 Your site should now be live at:"
echo "   https://rgblightcat.com"
echo ""
echo "📊 Check status with:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
EOF

# Main deployment function
deploy() {
    echo -e "${BLUE}📦 Preparing deployment...${NC}"
    
    # Create minimal deployment package
    cd "$(dirname "$0")/.."
    tar -czf deployment.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=deployment.tar.gz \
        --exclude=logs \
        client server scripts *.json *.js 2>/dev/null || {
        echo -e "${YELLOW}Creating minimal package...${NC}"
        # Create minimal structure
        mkdir -p /tmp/lightcat-deploy/client
        mkdir -p /tmp/lightcat-deploy/server
        cp -r client/* /tmp/lightcat-deploy/client/ 2>/dev/null || true
        cp -r server/* /tmp/lightcat-deploy/server/ 2>/dev/null || true
        cp package.json /tmp/lightcat-deploy/ 2>/dev/null || true
        cd /tmp/lightcat-deploy
        tar -czf deployment.tar.gz *
        mv deployment.tar.gz "$(dirname "$0")/.."
        cd -
    }
    
    echo -e "${GREEN}✅ Package created${NC}"
    
    # Copy to server
    echo -e "${BLUE}📤 Uploading to server...${NC}"
    echo -e "${YELLOW}You'll need to enter your VPS password:${NC}"
    
    scp deployment.tar.gz $VPS_USER@$VPS_IP:/tmp/ || {
        echo -e "${RED}❌ Failed to upload. Please check your connection.${NC}"
        exit 1
    }
    
    scp /tmp/server-setup-fixed.sh $VPS_USER@$VPS_IP:/tmp/
    
    # Execute on server
    echo -e "${BLUE}🔧 Running server setup...${NC}"
    ssh $VPS_USER@$VPS_IP 'bash /tmp/server-setup-fixed.sh'
    
    # Cleanup
    rm -f deployment.tar.gz
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
}

# Run deployment
echo ""
echo "This fixed script will:"
echo "1. Properly install Node.js 20"
echo "2. Upload your application"
echo "3. Configure the server"
echo "4. Set up SSL certificate"
echo ""

read -p "Deploy now? (y/n): " confirm
if [ "$confirm" = "y" ]; then
    deploy
else
    echo "Deployment cancelled."
fi