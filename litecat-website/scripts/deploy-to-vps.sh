#!/bin/bash

# LIGHTCAT RGB Token Platform - VPS Deployment Script
# For Ubuntu 25.04 on srv890142.hstgr.cloud (147.93.105.138)

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="147.93.105.138"
VPS_USER="root"
DOMAIN="www.rgblightcat.com"
APP_DIR="/opt/lightcat"
NODE_VERSION="20"
RGB_NODE_DIR="/opt/rgb-node"

echo -e "${BLUE}🚀 LIGHTCAT VPS Deployment Script${NC}"
echo -e "${YELLOW}Target: $VPS_USER@$VPS_IP${NC}"
echo -e "${YELLOW}Domain: $DOMAIN${NC}"
echo ""

# Function to check if running on VPS
check_environment() {
    if [[ ! -f /etc/hostname ]] || [[ $(hostname) != "srv890142" ]]; then
        echo -e "${YELLOW}⚠️  This script should be run on the VPS, not locally.${NC}"
        echo -e "${YELLOW}Would you like to copy and execute it on the VPS? (y/n)${NC}"
        read -r response
        if [[ "$response" == "y" ]]; then
            deploy_to_vps
        else
            exit 0
        fi
    fi
}

# Function to deploy script to VPS and execute
deploy_to_vps() {
    echo -e "${BLUE}📤 Copying deployment script to VPS...${NC}"
    scp "$0" "$VPS_USER@$VPS_IP:/tmp/deploy-lightcat.sh"
    
    echo -e "${BLUE}🚀 Executing deployment on VPS...${NC}"
    ssh "$VPS_USER@$VPS_IP" "bash /tmp/deploy-lightcat.sh"
    exit 0
}

# Function to install system dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing system dependencies...${NC}"
    
    apt-get update
    apt-get install -y \
        curl \
        git \
        build-essential \
        nginx \
        certbot \
        python3-certbot-nginx \
        redis-server \
        ufw \
        htop \
        unzip \
        jq \
        supervisor
    
    # Install Node.js
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    
    # Install PM2 globally
    npm install -g pm2
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to setup firewall
setup_firewall() {
    echo -e "${BLUE}🔥 Configuring firewall...${NC}"
    
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 8094/tcp  # RGB node
    ufw --force enable
    
    echo -e "${GREEN}✅ Firewall configured${NC}"
}

# Function to create application user
create_app_user() {
    echo -e "${BLUE}👤 Creating application user...${NC}"
    
    if ! id -u lightcat >/dev/null 2>&1; then
        useradd -m -s /bin/bash lightcat
        usermod -aG sudo lightcat
    fi
    
    # Create directories
    mkdir -p "$APP_DIR"
    mkdir -p "$RGB_NODE_DIR"
    mkdir -p /var/log/lightcat
    
    chown -R lightcat:lightcat "$APP_DIR"
    chown -R lightcat:lightcat "$RGB_NODE_DIR"
    chown -R lightcat:lightcat /var/log/lightcat
    
    echo -e "${GREEN}✅ Application user created${NC}"
}

# Function to clone and setup application
setup_application() {
    echo -e "${BLUE}📥 Setting up LIGHTCAT application...${NC}"
    
    cd "$APP_DIR"
    
    # Clone repository (or copy files)
    if [[ ! -d "$APP_DIR/litecat-website" ]]; then
        # For now, we'll create the directory structure
        # In production, you'd clone from git
        mkdir -p litecat-website
        echo -e "${YELLOW}⚠️  Please upload application files to $APP_DIR/litecat-website${NC}"
    fi
    
    cd litecat-website
    
    # Install dependencies
    if [[ -f package.json ]]; then
        sudo -u lightcat npm install --production
    fi
    
    echo -e "${GREEN}✅ Application setup complete${NC}"
}

# Function to setup environment variables
setup_environment() {
    echo -e "${BLUE}🔐 Setting up environment variables...${NC}"
    
    cat > "$APP_DIR/litecat-website/.env" << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3000
CLIENT_URL=https://www.rgblightcat.com

# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# Bitcoin Configuration
BTC_WALLET_ADDRESS=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
BTC_WALLET_XPUB=your_xpub

# RGB Configuration
RGB_NODE_URL=http://localhost:8094
RGB_NODE_API_KEY=your_rgb_api_key
RGB_NETWORK=mainnet
RGB_ASSET_ID=your_asset_id

# Lightning Configuration
LIGHTNING_NODE_URL=your_voltage_url
LIGHTNING_MACAROON=your_macaroon
LIGHTNING_TLS_CERT=your_tls_cert

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@rgblightcat.com
EMAIL_FROM_NAME=LIGHTCAT

# Security
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_API_KEY=$(openssl rand -base64 32)

# Redis
REDIS_URL=redis://localhost:6379

# Monitoring
LOG_LEVEL=info
EOF
    
    chown lightcat:lightcat "$APP_DIR/litecat-website/.env"
    chmod 600 "$APP_DIR/litecat-website/.env"
    
    echo -e "${GREEN}✅ Environment variables configured${NC}"
    echo -e "${YELLOW}⚠️  Please update .env with actual values${NC}"
}

# Function to setup Nginx
setup_nginx() {
    echo -e "${BLUE}🌐 Configuring Nginx...${NC}"
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/lightcat << 'EOF'
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name www.rgblightcat.com rgblightcat.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name www.rgblightcat.com;

    # SSL configuration will be added by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    # Logging
    access_log /var/log/nginx/lightcat_access.log;
    error_log /var/log/nginx/lightcat_error.log;

    # Static files
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
        
        # Increase timeouts for payment processing
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

    # Game assets
    location /game {
        alias /opt/lightcat/litecat-website/client/game;
        try_files $uri $uri/ =404;
    }

    # Static assets with caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|webp|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}

# Redirect non-www to www
server {
    listen 443 ssl http2;
    server_name rgblightcat.com;
    return 301 https://www.rgblightcat.com$request_uri;
}
EOF
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/lightcat /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    echo -e "${GREEN}✅ Nginx configured${NC}"
}

# Function to setup SSL certificate
setup_ssl() {
    echo -e "${BLUE}🔒 Setting up SSL certificate...${NC}"
    
    # Check if domain is pointing to this server
    DOMAIN_IP=$(dig +short "$DOMAIN" | tail -n1)
    if [[ "$DOMAIN_IP" != "$VPS_IP" ]]; then
        echo -e "${YELLOW}⚠️  Domain $DOMAIN is not pointing to $VPS_IP${NC}"
        echo -e "${YELLOW}Please update DNS records before continuing${NC}"
        return
    fi
    
    # Obtain certificate
    certbot --nginx -d "$DOMAIN" -d "rgblightcat.com" --non-interactive --agree-tos -m admin@rgblightcat.com
    
    # Setup auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    echo -e "${GREEN}✅ SSL certificate configured${NC}"
}

# Function to setup PM2 services
setup_services() {
    echo -e "${BLUE}🚀 Setting up application services...${NC}"
    
    cd "$APP_DIR/litecat-website"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'lightcat-api',
      script: './server/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/lightcat/api-error.log',
      out_file: '/var/log/lightcat/api-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'lightcat-ui',
      script: './server/ui-server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 8082
      },
      error_file: '/var/log/lightcat/ui-error.log',
      out_file: '/var/log/lightcat/ui-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
EOF
    
    # Start services with PM2
    sudo -u lightcat pm2 start ecosystem.config.js
    sudo -u lightcat pm2 save
    
    # Setup PM2 startup
    pm2 startup systemd -u lightcat --hp /home/lightcat
    
    echo -e "${GREEN}✅ Application services configured${NC}"
}

# Function to setup RGB node
setup_rgb_node() {
    echo -e "${BLUE}🌈 Setting up RGB node...${NC}"
    
    cd "$RGB_NODE_DIR"
    
    # Run the RGB node installation script
    if [[ -f "$APP_DIR/litecat-website/scripts/install-rgb-node.sh" ]]; then
        sudo -u lightcat bash "$APP_DIR/litecat-website/scripts/install-rgb-node.sh"
    else
        echo -e "${YELLOW}⚠️  RGB node installation script not found${NC}"
    fi
    
    echo -e "${GREEN}✅ RGB node setup complete${NC}"
}

# Function to setup monitoring
setup_monitoring() {
    echo -e "${BLUE}📊 Setting up monitoring...${NC}"
    
    # Install monitoring tools
    wget -O /tmp/netdata-install.sh https://my-netdata.io/kickstart.sh
    bash /tmp/netdata-install.sh --dont-wait
    
    # Configure log rotation
    cat > /etc/logrotate.d/lightcat << 'EOF'
/var/log/lightcat/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 lightcat lightcat
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    echo -e "${GREEN}✅ Monitoring configured${NC}"
}

# Function to display final instructions
show_final_instructions() {
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Update environment variables in $APP_DIR/litecat-website/.env"
    echo "2. Upload application files if not already done"
    echo "3. Import RGB wallet seed phrase securely"
    echo "4. Configure Lightning node connection"
    echo "5. Update DNS records to point to $VPS_IP"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "- Check services: pm2 status"
    echo "- View logs: pm2 logs"
    echo "- Restart services: pm2 restart all"
    echo "- Check Nginx: systemctl status nginx"
    echo "- View metrics: http://$VPS_IP:19999 (Netdata)"
    echo ""
    echo -e "${YELLOW}⚠️  Important Security Steps:${NC}"
    echo "1. Change default passwords"
    echo "2. Setup SSH key authentication"
    echo "3. Disable root SSH login"
    echo "4. Configure fail2ban"
    echo "5. Regular security updates"
}

# Main execution
main() {
    echo -e "${BLUE}Starting LIGHTCAT VPS deployment...${NC}"
    
    # Check if we're on the VPS
    if [[ $(hostname) == "srv890142" ]] || [[ "$1" == "--force" ]]; then
        # We're on the VPS, proceed with installation
        install_dependencies
        setup_firewall
        create_app_user
        setup_application
        setup_environment
        setup_nginx
        setup_ssl
        setup_services
        setup_rgb_node
        setup_monitoring
        show_final_instructions
    else
        # We're not on the VPS, offer to deploy
        check_environment
    fi
}

# Run main function
main "$@"