#!/bin/bash
# Final fix for UI server

cd /var/www/rgblightcat
pm2 delete ui 2>/dev/null

# Check what's wrong
echo "Checking for issues..."
if [ ! -f "serve-ui.js" ]; then
    echo "serve-ui.js missing!"
fi

if [ ! -d "client" ]; then
    echo "client folder missing!"
    exit 1
fi

# Create a working serve-ui.js
cat > serve-ui.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;

const server = http.createServer((req, res) => {
    console.log('Request:', req.url);
    
    // Default to index.html
    let filePath = './client' + (req.url === '/' ? '/index.html' : req.url);
    
    // Security check
    filePath = path.normalize(filePath);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('File error:', err.message);
            res.writeHead(404);
            res.end('Not found');
        } else {
            // Detect content type
            let contentType = 'text/html';
            if (filePath.endsWith('.js')) contentType = 'text/javascript';
            else if (filePath.endsWith('.css')) contentType = 'text/css';
            else if (filePath.endsWith('.json')) contentType = 'application/json';
            else if (filePath.endsWith('.png')) contentType = 'image/png';
            else if (filePath.endsWith('.jpg')) contentType = 'image/jpeg';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log(`UI server running on port ${PORT}`);
});
EOF

# Test it directly first
echo "Testing serve-ui.js..."
node serve-ui.js &
PID=$!
sleep 2

if curl -s http://localhost:8082 > /dev/null; then
    echo "✅ UI server works!"
    kill $PID
    
    # Start with PM2
    pm2 start serve-ui.js --name ui
    pm2 save
else
    echo "❌ UI server failed to start"
    kill $PID 2>/dev/null
fi

pm2 status
echo "Check http://rgblightcat.com"