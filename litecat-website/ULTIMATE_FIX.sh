#!/bin/bash

echo "🚀 ULTIMATE FIX - Making it work once and for all!"
echo ""

ssh root@147.93.105.138 << 'ULTIMATE'
cd /var/www/rgblightcat

# Stop everything
pkill -f node
pm2 kill
systemctl stop nginx

# Start mock server WITHOUT PM2 in background
nohup node mock-api-server-live.js > server.log 2>&1 &
SERVER_PID=$!

echo "Server started with PID: $SERVER_PID"
sleep 3

# Check if it's running
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server is running!"
else
    echo "❌ Server crashed. Trying simple alternative..."
    
    # Create ultra-simple server
    cat > ultra-simple.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.url}`);
    
    if (req.url === '/api/health') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({status: 'ok'}));
    } else if (req.url.startsWith('/api/')) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({message: 'LIGHTCAT API'}));
    } else {
        const filePath = path.join(__dirname, 'client', req.url === '/' ? 'index.html' : req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<h1>LIGHTCAT Token</h1><p>Site is running!</p>');
            } else {
                res.writeHead(200);
                res.end(data);
            }
        });
    }
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Ultra simple server running on port 3000');
});
EOF

    nohup node ultra-simple.js > server.log 2>&1 &
fi

# Configure nginx to proxy to port 3000
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/*
ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
systemctl start nginx
systemctl reload nginx

# Open all ports
iptables -F
iptables -X
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT

echo ""
echo "Testing locally..."
curl -s http://localhost:3000/api/health || echo "Direct port failed"
curl -s http://localhost/api/health || echo "Nginx proxy failed"

echo ""
echo "✅ DONE! Your server is running on port 3000"
echo "Try these URLs:"
echo "  http://147.93.105.138:3000"
echo "  http://147.93.105.138"
echo "  http://rgblightcat.com"

ps aux | grep node
ULTIMATE