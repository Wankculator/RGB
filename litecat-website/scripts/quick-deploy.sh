#!/bin/bash

# Quick Deploy Script for LIGHTCAT on VPS
# Simplified version for rapid deployment

set -e

# Configuration
VPS_IP="${1:-147.93.105.138}"
VPS_USER="${2:-root}"
DOMAIN="${3:-www.rgblightcat.com}"

echo "🚀 LIGHTCAT Quick Deploy"
echo "📍 Target: $VPS_USER@$VPS_IP"
echo "🌐 Domain: $DOMAIN"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf lightcat-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=*.log \
  --exclude=uploads \
  --exclude=.env \
  .

# Upload to VPS
echo "📤 Uploading to VPS..."
scp lightcat-deploy.tar.gz "$VPS_USER@$VPS_IP:/tmp/"

# Create deployment script
cat > /tmp/remote-deploy.sh << 'SCRIPT'
#!/bin/bash
set -e

# Update system
apt-get update
apt-get install -y curl git nginx redis-server ufw

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Setup firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create app directory
mkdir -p /opt/lightcat
cd /opt/lightcat

# Extract application
tar -xzf /tmp/lightcat-deploy.tar.gz

# Install dependencies
cd litecat-website
npm install --production

# Create .env file
cat > .env << 'ENV'
NODE_ENV=production
PORT=3000
CLIENT_URL=https://www.rgblightcat.com

# Add your configuration here
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_ANON_KEY=
SENDGRID_API_KEY=
RGB_NODE_URL=http://localhost:8094
LIGHTNING_NODE_URL=
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_API_KEY=$(openssl rand -base64 32)
ENV

# Setup Nginx
cat > /etc/nginx/sites-available/lightcat << 'NGINX'
server {
    listen 80;
    server_name www.rgblightcat.com rgblightcat.com;
    
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
NGINX

ln -sf /etc/nginx/sites-available/lightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Start services with PM2
pm2 start server/server.js --name lightcat-api
pm2 start server/ui-server.js --name lightcat-ui
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "📝 Next steps:"
echo "1. Update .env with your actual values"
echo "2. Setup SSL with: certbot --nginx -d www.rgblightcat.com"
echo "3. Import RGB wallet seed phrase"
echo "4. Configure Lightning node connection"
SCRIPT

# Execute on VPS
echo "🚀 Running deployment on VPS..."
scp /tmp/remote-deploy.sh "$VPS_USER@$VPS_IP:/tmp/"
ssh "$VPS_USER@$VPS_IP" "bash /tmp/remote-deploy.sh"

# Cleanup
rm -f lightcat-deploy.tar.gz
rm -f /tmp/remote-deploy.sh

echo ""
echo "✨ Quick deployment complete!"
echo ""
echo "📋 Post-deployment checklist:"
echo "- [ ] Update environment variables in /opt/lightcat/litecat-website/.env"
echo "- [ ] Setup SSL certificate: ssh $VPS_USER@$VPS_IP 'certbot --nginx -d $DOMAIN'"
echo "- [ ] Configure DNS to point $DOMAIN to $VPS_IP"
echo "- [ ] Import RGB wallet seed phrase"
echo "- [ ] Test the deployment at http://$VPS_IP"
echo ""
echo "🔧 Useful commands:"
echo "- SSH to VPS: ssh $VPS_USER@$VPS_IP"
echo "- Check services: pm2 status"
echo "- View logs: pm2 logs"
echo "- Restart services: pm2 restart all"