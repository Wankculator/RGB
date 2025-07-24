#!/bin/bash
# Final PM2 fix for UI server

cd /var/www/rgblightcat
pm2 delete ui 2>/dev/null

# Check what user PM2 is running as
echo "PM2 running as user: $(whoami)"

# Create a new serve-ui.js with error handling
cat > serve-ui.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;

console.log('Starting UI server...');
console.log('Working directory:', __dirname);

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, 'client', req.url === '/' ? 'index.html' : req.url);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('File not found:', filePath);
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200);
            res.end(data);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`UI server listening on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
EOF

# Fix permissions
chmod 755 serve-ui.js

# Try different PM2 start methods
echo "Trying PM2 start method 1..."
pm2 start serve-ui.js --name ui --max-memory-restart 200M

# Wait and check
sleep 3
if pm2 list | grep -q "ui.*online"; then
    echo "✅ UI server started successfully!"
else
    echo "❌ Method 1 failed, trying method 2..."
    pm2 delete ui 2>/dev/null
    
    # Try with ecosystem file
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ui',
    script: './serve-ui.js',
    cwd: '/var/www/rgblightcat',
    max_memory_restart: '200M',
    error_file: '/var/www/rgblightcat/logs/ui-error.log',
    out_file: '/var/www/rgblightcat/logs/ui-out.log'
  }]
}
EOF
    
    pm2 start ecosystem.config.js
fi

# Save and show status
pm2 save
pm2 status

# Test
echo ""
echo "Testing servers..."
curl -s http://localhost:8082 > /dev/null && echo "✅ UI server responding!" || echo "❌ UI server not responding"
curl -s http://localhost:3000/health > /dev/null && echo "✅ API server responding!" || echo "❌ API server not responding"

# Check site
response=$(curl -s -o /dev/null -w "%{http_code}" http://rgblightcat.com)
echo ""
if [ "$response" = "200" ]; then
    echo "🎉 Site is working! Visit http://rgblightcat.com"
else
    echo "Site returned HTTP $response"
    echo "Checking nginx error:"
    tail -5 /var/log/nginx/error.log
fi