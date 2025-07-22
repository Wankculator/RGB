#!/bin/bash

# VPS Deployment Script for LITECAT
# Supports Ubuntu/Debian VPS deployment

set -e

# Configuration
DOMAIN="litecat.xyz"
APP_DIR="/var/www/litecat"
NGINX_CONF="/etc/nginx/sites-available/litecat"
SSL_EMAIL="admin@litecat.xyz"

echo "🚀 LITECAT VPS Deployment Script"
echo "================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
apt-get install -y \
  curl \
  git \
  nginx \
  nodejs \
  npm \
  redis-server \
  certbot \
  python3-certbot-nginx \
  ufw \
  fail2ban

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Setup firewall
echo "🔒 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable

# Configure Redis
echo "🔧 Configuring Redis..."
sed -i 's/^# requirepass foobared/requirepass your_redis_password_here/' /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server

# Create application directory
echo "📁 Setting up application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone or update repository
if [ -d ".git" ]; then
  echo "📥 Updating repository..."
  git pull origin main
else
  echo "📥 Cloning repository..."
  git clone https://github.com/yourusername/litecat-website.git .
fi

# Install dependencies
echo "📦 Installing application dependencies..."
npm ci --production

# Build application
echo "🏗️  Building application..."
npm run build:production

# Setup environment
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
  cp .env.production .env
  echo "⚠️  Please edit .env file with your production values"
fi

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'litecat-api',
    script: './dist/server/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
EOF

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 stop litecat-api || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

# Configure Nginx
echo "🔧 Configuring Nginx..."
cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL configuration will be added by Certbot
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Static files
    location / {
        root $APP_DIR/dist/client;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
EOF

# Enable Nginx site
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
systemctl enable nginx

# Setup SSL with Let's Encrypt
echo "🔒 Setting up SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $SSL_EMAIL

# Setup automatic SSL renewal
echo "🔄 Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/bin/certbot renew --quiet") | crontab -

# Setup log rotation
echo "📋 Setting up log rotation..."
cat > /etc/logrotate.d/litecat << EOF
$APP_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Setup monitoring
echo "📊 Setting up monitoring..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Final checks
echo "🔍 Running final checks..."
pm2 status
nginx -t
redis-cli ping

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Edit $APP_DIR/.env with your production values"
echo "2. Run database migrations: cd $APP_DIR && npm run db:migrate"
echo "3. Check application status: pm2 status"
echo "4. View logs: pm2 logs"
echo "5. Monitor: pm2 monit"
echo ""
echo "Your site should be available at: https://$DOMAIN"