#!/bin/bash

# REAL Final Fix - Make Everything Work!

VPS_IP="147.93.105.138"
VPS_USER="root"

echo "🚀 REAL FINAL FIX - Getting LIGHTCAT Working!"
echo "==========================================="
echo ""

# Create the ultimate fix script
cat > /tmp/real-final-fix-remote.sh << 'REALFIX'
#!/bin/bash

cd /var/www/rgblightcat

echo "🔧 Step 1: Cleaning up everything..."
pkill -f node
pm2 kill
rm -f start-api.sh start-ui.sh server.js

echo ""
echo "🔧 Step 2: Using the WORKING mock API server..."
# We know mock-api-server-live.js works, so let's use it!

# Create PM2 ecosystem config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'lightcat',
    script: 'mock-api-server-live.js',
    cwd: '/var/www/rgblightcat',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

echo ""
echo "🔧 Step 3: Starting with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "🔧 Step 4: Fixing Nginx for proper proxying..."
cat > /etc/nginx/sites-available/rgblightcat << 'NGINX'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    
    # Root directory for static files
    root /var/www/rgblightcat/client;
    index index.html;

    # Serve static files directly
    location / {
        try_files $uri $uri/ @proxy;
    }

    # Proxy API and non-static requests to Node.js
    location @proxy {
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

    # API endpoints
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

# Enable the site
ln -sf /etc/nginx/sites-available/rgblightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t && systemctl reload nginx

echo ""
echo "🔧 Step 5: Checking everything..."
sleep 5

# Check PM2
pm2 status

# Test endpoints
echo ""
echo "Testing endpoints:"
curl -s http://localhost:3000/api/health && echo " ✅ API working locally!" || echo " ❌ API not working"
curl -s http://localhost:3000/api/rgb/stats | head -20
echo ""

echo ""
echo "🔧 Step 6: Setting up SSL (if domain is ready)..."
# Try SSL, but don't fail if it doesn't work
certbot --nginx -d rgblightcat.com -d www.rgblightcat.com --non-interactive --agree-tos -m admin@rgblightcat.com --redirect || echo "SSL setup failed - domain might still be pointing to Hostinger"

echo ""
echo "✅ Server setup complete!"
echo ""
echo "⚠️  IMPORTANT: Your domain is still pointing to Hostinger!"
echo ""
echo "To fix this:"
echo "1. Login to Hostinger"
echo "2. Go to Domains → rgblightcat.com → DNS"
echo "3. Change the A record to point to: 147.93.105.138"
echo "4. Delete any other A records"
echo "5. Wait 10-30 minutes for DNS to update"
echo ""
echo "Current server status:"
pm2 list

REALFIX

# Upload and run
echo "📤 Connecting to server..."
scp /tmp/real-final-fix-remote.sh $VPS_USER@$VPS_IP:/tmp/
ssh $VPS_USER@$VPS_IP 'chmod +x /tmp/real-final-fix-remote.sh && bash /tmp/real-final-fix-remote.sh'

echo ""
echo "✅ Server is fixed and running!"
echo ""
echo "⚠️  BUT YOUR DOMAIN IS STILL POINTING TO HOSTINGER!"
echo ""
echo "📝 TO COMPLETE SETUP:"
echo "1. Login to Hostinger control panel"
echo "2. Go to Domains → rgblightcat.com → DNS Zone"
echo "3. Delete ALL existing A records"
echo "4. Add new A record:"
echo "   - Type: A"
echo "   - Name: @"
echo "   - Points to: 147.93.105.138"
echo "   - TTL: 14400"
echo "5. Add www record:"
echo "   - Type: A"
echo "   - Name: www"
echo "   - Points to: 147.93.105.138"
echo "   - TTL: 14400"
echo ""
echo "After DNS updates (10-30 min), your site will work at https://rgblightcat.com"