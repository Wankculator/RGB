#!/bin/bash

echo "🔧 FINAL NETWORK FIX"
echo ""

ssh root@147.93.105.138 << 'FIXNETWORK'
# Fix firewall
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable

# Check if server is actually running
pm2 status
curl http://localhost:3000/api/health

# Fix nginx to serve directly from port 3000
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Remove all other configs
rm -f /etc/nginx/sites-enabled/*
ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/

# Restart nginx
systemctl restart nginx

echo ""
echo "Testing:"
curl -I http://localhost
curl http://localhost/api/health

echo ""
echo "✅ Try now: http://rgblightcat.com or http://147.93.105.138"
FIXNETWORK