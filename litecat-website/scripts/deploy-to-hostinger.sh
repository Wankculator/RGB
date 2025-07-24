#!/bin/bash

# LIGHTCAT Deployment Script for Hostinger VPS
# Domain: rgblightcat.com
# Server: 147.93.105.138

set -euo pipefail

# Configuration
DOMAIN="rgblightcat.com"
VPS_IP="147.93.105.138"
VPS_USER="root"
APP_DIR="/var/www/rgblightcat"
REPO_URL="https://github.com/yourusername/lightcat-website.git"  # Update this!

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🚀 LIGHTCAT Deployment to Hostinger VPS${NC}"
echo "========================================="
echo "Domain: $DOMAIN"
echo "Server: $VPS_IP"
echo "Location: Mumbai, India"
echo ""

# Function to deploy
deploy() {
    echo -e "${BLUE}📦 Preparing deployment package...${NC}"
    
    # Create deployment archive
    cd "$(dirname "$0")/.."
    tar -czf deployment.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=.env.local \
        --exclude=deployment.tar.gz \
        --exclude=logs \
        --exclude=*.log \
        .
    
    echo -e "${GREEN}✅ Package created${NC}"
    
    # Copy to server
    echo -e "${BLUE}📤 Uploading to server...${NC}"
    scp deployment.tar.gz $VPS_USER@$VPS_IP:/tmp/
    
    # Copy deployment script
    scp scripts/server-setup.sh $VPS_USER@$VPS_IP:/tmp/
    
    # Execute on server
    echo -e "${BLUE}🔧 Running server setup...${NC}"
    ssh $VPS_USER@$VPS_IP 'bash /tmp/server-setup.sh'
    
    # Cleanup
    rm deployment.tar.gz
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
}

# Create server setup script
cat > scripts/server-setup.sh << 'EOF'
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

# Update system
apt update && apt upgrade -y

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
apt install -y nginx certbot python3-certbot-nginx nodejs npm git ufw fail2ban

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Create app directory
mkdir -p $APP_DIR
cd $APP_DIR

# Extract application
echo -e "${BLUE}📂 Extracting application...${NC}"
tar -xzf /tmp/deployment.tar.gz

# Install npm dependencies
echo -e "${BLUE}📦 Installing npm packages...${NC}"
npm install --production

# Create .env file
echo -e "${BLUE}🔐 Setting up environment...${NC}"
cat > .env << 'ENVFILE'
NODE_ENV=production
PORT=3000
CLIENT_URL=https://rgblightcat.com

# Copy your existing .env values here
SUPABASE_URL=https://xyfqpvxwvlemnraldbjd.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDk2MzksImV4cCI6MjA2ODY4NTYzOX0.dIF_7uErKhpAeBurPGv_oS3gQEfJ6sHQP9mr0FUuC0M

BTCPAY_URL=https://btcpay0.voltageapp.io
BTCPAY_API_KEY=1dpQWkChRWpEWiilo1D1ZlI0PEv7EOIIIhliMiD7LnM
BTCPAY_STORE_ID=HNQsGSwdyQb8Vg3y6srogKjXCDXdARt9Q113N4urcUcG
BTC_WALLET_ADDRESS=bc1qdsdr3ztdcvuj5kl0j4sh6qpe60579nx0dpgydu

RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
USE_MOCK_RGB=true
USE_BTCPAY=true

JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
ENVFILE

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
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'lightcat-client',
      script: './start-client.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 8082
      }
    }
  ]
};
PM2FILE

# Create client starter
cat > start-client.js << 'CLIENTFILE'
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'client')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`Client server running on port ${PORT}`);
});
CLIENTFILE

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Configure Nginx
echo -e "${BLUE}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/rgblightcat << 'NGINXFILE'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main app
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

    # API
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
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|doc|docx)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
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
ufw --force enable

# Get SSL certificate
echo -e "${BLUE}🔐 Getting SSL certificate...${NC}"
certbot --nginx -d rgblightcat.com -d www.rgblightcat.com --non-interactive --agree-tos -m admin@rgblightcat.com

# Create monitoring script
cat > /root/monitor-lightcat.sh << 'MONITOR'
#!/bin/bash
# Check if services are running
if ! pm2 list | grep -q "online"; then
    pm2 restart all
    echo "$(date): Restarted PM2 services" >> /var/log/lightcat-monitor.log
fi
MONITOR

chmod +x /root/monitor-lightcat.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/monitor-lightcat.sh") | crontab -

echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""
echo "🎉 Your site is now live at:"
echo "   https://rgblightcat.com"
echo ""
echo "📊 Useful commands:"
echo "   pm2 status         - Check app status"
echo "   pm2 logs           - View logs"
echo "   pm2 restart all    - Restart apps"
echo "   nginx -t           - Test nginx config"
echo ""
EOF

# Make server setup executable
chmod +x scripts/server-setup.sh

# Main menu
echo ""
echo "Ready to deploy to Hostinger VPS!"
echo ""
echo "This will:"
echo "1. Upload your application"
echo "2. Install all dependencies"
echo "3. Configure Nginx with SSL"
echo "4. Set up PM2 for process management"
echo "5. Configure firewall"
echo "6. Make your site live at https://rgblightcat.com"
echo ""

read -p "Deploy now? (y/n): " confirm
if [ "$confirm" = "y" ]; then
    deploy
else
    echo "Deployment cancelled."
    echo "Run this script again when ready."
fi