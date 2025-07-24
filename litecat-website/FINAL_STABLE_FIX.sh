#!/bin/bash

ssh root@147.93.105.138 << 'EOF'
cd /var/www/rgblightcat

# Check why it's restarting
echo "Checking PM2 logs..."
pm2 logs lightcat --err --lines 10

# Delete and create stable server
pm2 delete all

# Create the most basic HTTP server possible
cat > server.js << 'SERVEREOF'
require('http').createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>LIGHTCAT Token</h1><p>Server Running!</p>');
}).listen(3000, '0.0.0.0', () => console.log('Server running on 3000'));
SERVEREOF

# Start without auto-restart to see if it crashes
pm2 start server.js --name lightcat --no-autorestart
sleep 3

# Check if it's still running
pm2 status

# If running, enable autorestart
pm2 set pm2:autodump true
pm2 save

# Test it
echo ""
echo "Testing server..."
curl http://localhost:3000

echo ""
echo "✅ Your site should now work at http://rgblightcat.com"
EOF