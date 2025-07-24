#!/bin/bash

# Automatic 403 fix script

set -e

VPS_IP="147.93.105.138"
VPS_USER="root"

echo "🔧 Fixing 403 Error on rgblightcat.com"
echo "======================================"
echo ""

# Create fix script
cat > /tmp/fix-403-remote.sh << 'FIXSCRIPT'
#!/bin/bash

echo "🔍 Checking current status..."

# Check if directory exists
if [ ! -d "/var/www/rgblightcat" ]; then
    echo "📁 Creating directory structure..."
    mkdir -p /var/www/rgblightcat/client
    mkdir -p /var/www/rgblightcat/server
fi

# Check for deployment file
if [ -f "/tmp/deployment.tar.gz" ]; then
    echo "📦 Found deployment package, extracting..."
    cd /var/www/rgblightcat
    tar -xzf /tmp/deployment.tar.gz
else
    echo "📝 Creating temporary landing page..."
    cat > /var/www/rgblightcat/client/index.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
    <title>LIGHTCAT - RGB Protocol Token</title>
    <style>
        body {
            background: #0a0a0a;
            color: #00ff88;
            font-family: monospace;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
            border: 2px solid #00ff88;
            border-radius: 10px;
        }
        h1 { font-size: 3em; margin: 0; }
        p { font-size: 1.5em; }
        .loading {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐱 LIGHTCAT</h1>
        <p>RGB Protocol Token</p>
        <p class="loading">Deployment in progress...</p>
        <p>Check back in a few minutes!</p>
    </div>
</body>
</html>
HTML
fi

# Fix permissions
echo "🔐 Fixing permissions..."
chown -R www-data:www-data /var/www/rgblightcat
chmod -R 755 /var/www/rgblightcat

# Configure Nginx properly
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/rgblightcat << 'NGINX'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    
    root /var/www/rgblightcat/client;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /game.html {
        try_files $uri =404;
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/rgblightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
echo "🔄 Reloading Nginx..."
nginx -t && systemctl reload nginx

# Check PM2
echo "📊 Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo "PM2 not installed yet, deployment might still be running"
fi

echo ""
echo "✅ Fix complete!"
echo ""
echo "🌐 Your site should now be accessible at:"
echo "   http://rgblightcat.com"
echo ""
echo "If you still see 403:"
echo "1. The deployment might still be running"
echo "2. Check deployment logs"
echo "3. Wait a few minutes and refresh"

FIXSCRIPT

# Upload and run fix
echo "📤 Uploading fix to server..."
echo "You'll need to enter your VPS password:"

scp /tmp/fix-403-remote.sh $VPS_USER@$VPS_IP:/tmp/
ssh $VPS_USER@$VPS_IP 'chmod +x /tmp/fix-403-remote.sh && bash /tmp/fix-403-remote.sh'

echo ""
echo "🎉 Done! Check https://rgblightcat.com now!"