#!/bin/bash
# LIGHTCAT Server Fix Script - Run on VPS

set -e

echo "🔧 LIGHTCAT Server Fix Script"
echo "============================="

# Step 1: Check current status
echo ""
echo "📊 Current PM2 Status:"
pm2 status

# Step 2: Check logs for errors
echo ""
echo "🔍 Checking UI server errors:"
pm2 logs lightcat-ui --err --lines 10 || true

echo ""
echo "🔍 Checking API server errors:"
pm2 logs lightcat-api --err --lines 10 || true

# Step 3: Stop all PM2 processes
echo ""
echo "🛑 Stopping all services..."
pm2 delete all || true

# Step 4: Check if files exist
echo ""
echo "📁 Checking application files:"
ls -la /var/www/rgblightcat/serve-ui.js || echo "❌ serve-ui.js not found!"
ls -la /var/www/rgblightcat/server/app.js || echo "❌ server/app.js not found!"

# Step 5: Fix missing files if needed
cd /var/www/rgblightcat

# Create serve-ui.js if missing
if [ ! -f "serve-ui.js" ]; then
    echo "📝 Creating serve-ui.js..."
    cat > serve-ui.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'client', req.url === '/' ? 'index.html' : req.url);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, 'client', 'index.html'), (error, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 8082;
server.listen(PORT, () => {
  console.log(`🌐 LIGHTCAT UI running on http://localhost:${PORT}`);
});
EOF
fi

# Step 6: Start services properly
echo ""
echo "🚀 Starting services..."

# Start API server
echo "Starting API server..."
pm2 start server/app.js --name lightcat-api --max-memory-restart 500M || {
    echo "❌ Failed to start API server"
    echo "Trying alternative start method..."
    cd /var/www/rgblightcat
    pm2 start "node server/app.js" --name lightcat-api
}

# Start UI server
echo "Starting UI server..."
pm2 start serve-ui.js --name lightcat-ui --max-memory-restart 200M || {
    echo "❌ Failed to start UI server"
    echo "Trying alternative start method..."
    pm2 start "node serve-ui.js" --name lightcat-ui
}

# Step 7: Save PM2 configuration
pm2 save

# Step 8: Test services
echo ""
echo "🧪 Testing services..."
sleep 5

# Check if services are running
pm2 status

# Test API
echo ""
echo "Testing API server..."
if curl -s -f http://localhost:3000/health > /dev/null; then
    echo "✅ API server is responding"
else
    echo "❌ API server not responding"
    echo "Checking API logs:"
    pm2 logs lightcat-api --lines 20
fi

# Test UI
echo ""
echo "Testing UI server..."
if curl -s -f http://localhost:8082 > /dev/null; then
    echo "✅ UI server is responding"
else
    echo "❌ UI server not responding"
    echo "Checking UI logs:"
    pm2 logs lightcat-ui --lines 20
fi

# Step 9: Test main site
echo ""
echo "🌐 Testing main site..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://rgblightcat.com)
if [ "$response" = "502" ]; then
    echo "❌ Site still showing 502 error"
    echo ""
    echo "Checking Nginx error log:"
    tail -10 /var/log/nginx/error.log
else
    echo "✅ Site is accessible! (HTTP $response)"
fi

# Step 10: Final status
echo ""
echo "📊 Final Status:"
pm2 status

echo ""
echo "🔗 Quick checks:"
echo "- API: curl http://localhost:3000/health"
echo "- UI: curl http://localhost:8082"
echo "- Site: http://rgblightcat.com"
echo ""
echo "📝 Useful commands:"
echo "- View logs: pm2 logs"
echo "- Monitor: pm2 monit"
echo "- Restart: pm2 restart all"

# Check if we need to fix ports
echo ""
echo "🔍 Checking port usage:"
netstat -tlnp | grep -E ':3000|:8082' || echo "No ports listening"

# If ports are blocked, try alternative ports
if ! netstat -tlnp | grep -q ':8082'; then
    echo ""
    echo "⚠️  Port 8082 not listening, checking for conflicts..."
    lsof -i :8082 || true
fi

echo ""
echo "✅ Script complete!"