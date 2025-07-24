#!/bin/bash
# LIGHTCAT Quick Fix for 502 Error
# Run this ON THE VPS after uploading deployment.tar.gz

set -e

echo "🚀 Starting LIGHTCAT 502 Fix..."

# Stop current services
echo "🛑 Stopping current services..."
pm2 delete all || true

# Extract application
echo "📦 Extracting application..."
cd /var/www/rgblightcat
tar -xzf /tmp/deployment.tar.gz

# Create directories
mkdir -p logs uploads temp

# Install dependencies
echo "📥 Installing dependencies..."
npm install --production

# Create .env file
echo "🔐 Creating environment configuration..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
CLIENT_URL=https://rgblightcat.com
SUPABASE_URL=https://xyfqpvxwvlemnraldbjd.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.dIF_7uErKhpAeBurPGv_oS3gQEfJ6sHQP9mr0FUuC0M
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
USE_MOCK_RGB=true
USE_MOCK_LIGHTNING=true
JWT_SECRET=08f986be66ff4453f80e5493dc4e55d48e713ec28fe0733713fd3b075e6ce2a0
ENABLE_RATE_LIMITING=true
ENABLE_TEST_ENDPOINTS=true
EOF

# Start services
echo "🚀 Starting services..."
pm2 start server/app.js --name lightcat-api
pm2 start serve-ui.js --name lightcat-ui
pm2 save

# Update Nginx
echo "🌐 Updating Nginx..."
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    
    location / {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

nginx -t && systemctl reload nginx

# Test
echo "🧪 Testing..."
sleep 3
pm2 status

echo "✅ Fix complete! Visit http://rgblightcat.com"