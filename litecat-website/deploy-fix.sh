#!/bin/bash

# LIGHTCAT VPS Deployment Fix Script
# This script fixes the 502 error and deploys the full application

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
VPS_IP="147.93.105.138"
VPS_USER="root"
REMOTE_DIR="/var/www/rgblightcat"

echo -e "${BLUE}🚀 LIGHTCAT VPS Deployment Fix${NC}"
echo -e "${YELLOW}Target: $VPS_USER@$VPS_IP${NC}"
echo ""

# Step 1: Upload deployment package
echo -e "${BLUE}📤 Uploading deployment package...${NC}"
scp deployment.tar.gz $VPS_USER@$VPS_IP:/tmp/

# Step 2: Deploy on VPS
echo -e "${BLUE}🔧 Deploying application on VPS...${NC}"

ssh $VPS_USER@$VPS_IP << 'ENDSSH'
set -e

# Colors for remote output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📦 Extracting application files...${NC}"
cd /var/www/rgblightcat

# Backup current state
if [ -f server.js ]; then
    cp server.js server.js.backup
fi

# Stop PM2 processes
echo -e "${BLUE}🛑 Stopping current services...${NC}"
pm2 delete all || true

# Extract new files
tar -xzf /tmp/deployment.tar.gz

# Create necessary directories
mkdir -p logs uploads temp

# Install dependencies
echo -e "${BLUE}📥 Installing dependencies...${NC}"
npm install --production

# Create/Update .env file
echo -e "${BLUE}🔐 Configuring environment...${NC}"
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3000
CLIENT_URL=https://rgblightcat.com

# Supabase Configuration
SUPABASE_URL=https://xyfqpvxwvlemnraldbjd.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.dIF_7uErKhpAeBurPGv_oS3gQEfJ6sHQP9mr0FUuC0M

# RGB Configuration (Mock Mode)
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
USE_MOCK_RGB=true
RGB_FALLBACK_TO_MOCK=true

# Lightning Configuration (Mock Mode)
USE_MOCK_LIGHTNING=true

# Security
JWT_SECRET=08f986be66ff4453f80e5493dc4e55d48e713ec28fe0733713fd3b075e6ce2a0
JWT_REFRESH_SECRET=84826a5ef2ac9272db81b552300bff15eb58a6b002c527c3e2f4a3d5360d6ea6
SESSION_SECRET=1b8f47c1729dab9bae3834eb5b818df12ead1059d08d055d1101b621d7e26b7b

# Feature Flags
ENABLE_BULK_PURCHASES=false
ENABLE_RATE_LIMITING=true
ENABLE_WEBHOOK_VALIDATION=true
ENABLE_DEBUG_LOGGING=false
ENABLE_TEST_ENDPOINTS=true
EOF

# Set permissions
chmod 600 .env

# Start services with PM2
echo -e "${BLUE}🚀 Starting services...${NC}"

# Start API server
pm2 start server/app.js --name lightcat-api --error logs/api-error.log --output logs/api-out.log

# Start UI server
pm2 start serve-ui.js --name lightcat-ui --error logs/ui-error.log --output logs/ui-out.log

# Save PM2 configuration
pm2 save
pm2 startup systemd -u root --hp /root

# Update Nginx configuration
echo -e "${BLUE}🌐 Updating Nginx configuration...${NC}"
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;

    # Main site - UI server
    location / {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
EOF

# Test and reload Nginx
nginx -t && systemctl reload nginx

# Check services status
echo -e "${BLUE}📊 Checking services status...${NC}"
pm2 status

# Test endpoints
echo -e "${BLUE}🧪 Testing endpoints...${NC}"
sleep 5

# Test UI server
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8082 | grep -q "200"; then
    echo -e "${GREEN}✅ UI server is running${NC}"
else
    echo -e "${RED}❌ UI server failed to start${NC}"
fi

# Test API server
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health | grep -q "200"; then
    echo -e "${GREEN}✅ API server is running${NC}"
else
    echo -e "${RED}❌ API server failed to start${NC}"
fi

# Test main site
if curl -s -o /dev/null -w "%{http_code}" http://rgblightcat.com | grep -q "502"; then
    echo -e "${RED}❌ Site still showing 502 error${NC}"
else
    echo -e "${GREEN}✅ Site is accessible!${NC}"
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${YELLOW}Visit http://rgblightcat.com to see your site${NC}"

# Show logs if there are errors
if pm2 list | grep -q "errored"; then
    echo -e "${RED}⚠️  Some services have errors. Showing logs:${NC}"
    pm2 logs --lines 20
fi

ENDSSH

echo -e "${GREEN}✅ Deployment script completed${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Visit http://rgblightcat.com to test the site"
echo "2. Run SSL setup: ssh $VPS_USER@$VPS_IP 'certbot --nginx -d rgblightcat.com -d www.rgblightcat.com'"
echo "3. Monitor services: ssh $VPS_USER@$VPS_IP 'pm2 monit'"