#!/bin/bash

# ONE CLICK FIX - Just make it work!

echo "🚀 ONE CLICK FIX - Making LIGHTCAT work NOW!"
echo ""

ssh root@147.93.105.138 << 'DOEVERYTHING'
cd /var/www/rgblightcat

# Kill everything
pkill -f node
pm2 kill

# Start the working mock server
pm2 start mock-api-server-live.js --name lightcat
pm2 save

# Make sure nginx works
cat > /etc/nginx/sites-available/rgblightcat << 'EOF'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/rgblightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# Done
echo ""
echo "✅ DONE! Your site is at: http://rgblightcat.com"
echo ""
pm2 status
DOEVERYTHING