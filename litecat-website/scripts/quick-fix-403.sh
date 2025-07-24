#!/bin/bash

# Quick fix for 403 error on rgblightcat.com

echo "🔧 Quick Fix for 403 Error"
echo "========================="
echo ""
echo "SSH to your server and run these commands:"
echo ""
echo "ssh root@147.93.105.138"
echo ""
echo "# Then run:"
cat << 'EOF'
# 1. Check if files exist
ls -la /var/www/rgblightcat/

# 2. If no files, create directory and basic index
mkdir -p /var/www/rgblightcat/client
echo "<h1>LIGHTCAT Coming Soon!</h1>" > /var/www/rgblightcat/client/index.html

# 3. Fix permissions
chown -R www-data:www-data /var/www/rgblightcat
chmod -R 755 /var/www/rgblightcat

# 4. Update Nginx to serve from correct directory
cat > /etc/nginx/sites-available/rgblightcat << 'NGINX'
server {
    listen 80;
    listen 443 ssl;
    server_name rgblightcat.com www.rgblightcat.com;
    
    root /var/www/rgblightcat/client;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
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

# 5. Test and reload Nginx
nginx -t && systemctl reload nginx

# 6. Check if PM2 is running your app
pm2 status

# If not running, start it:
cd /var/www/rgblightcat
pm2 start ecosystem.config.js || pm2 start server/index.js --name lightcat-api
pm2 save

echo "✅ Should be fixed! Check https://rgblightcat.com"
EOF