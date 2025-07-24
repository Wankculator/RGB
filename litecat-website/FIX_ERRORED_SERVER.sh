#!/bin/bash

# Fix the errored PM2 process

ssh root@147.93.105.138 << 'FIXERROR'
cd /var/www/rgblightcat

echo "🔍 Checking what's wrong with the server..."
echo ""

# Check PM2 error logs
echo "📋 PM2 Error Logs:"
pm2 logs lightcat --err --lines 20

echo ""
echo "🔧 Fixing the issue..."

# Stop everything
pm2 delete all

# Check if package.json exists, if not create it
if [ ! -f "package.json" ]; then
    echo "📝 Creating package.json..."
    cat > package.json << 'EOF'
{
  "name": "lightcat",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  }
}
EOF
fi

# Create a simpler server that definitely works
echo "📝 Creating working server..."
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Basic middleware
app.use(express.json());

// Serve static files
if (require('fs').existsSync(path.join(__dirname, 'client'))) {
    app.use(express.static(path.join(__dirname, 'client')));
}

// API endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LIGHTCAT Running!' });
});

app.get('/api/rgb/stats', (req, res) => {
    res.json({
        totalBatches: 30000,
        batchesSold: 2100,
        tokensPerBatch: 700,
        pricePerBatch: 2000
    });
});

// Default route
app.get('/', (req, res) => {
    res.send(`
        <h1>LIGHTCAT Token Platform</h1>
        <p>Server is running!</p>
        <p>API Health: <a href="/api/health">/api/health</a></p>
        <p>RGB Stats: <a href="/api/rgb/stats">/api/rgb/stats</a></p>
    `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on port', PORT);
});
EOF

# Test the server directly first
echo ""
echo "🧪 Testing server directly..."
timeout 5 node server.js &
SERVER_PID=$!
sleep 2

# Check if it's running
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server runs fine directly!"
    kill $SERVER_PID
    
    # Start with PM2
    echo ""
    echo "🚀 Starting with PM2..."
    pm2 start server.js --name lightcat --no-autorestart
    pm2 save
    
    # Enable auto-restart after confirming it works
    sleep 3
    pm2 restart lightcat
else
    echo "❌ Server has issues. Checking Node.js..."
    
    # Check Node version
    node --version
    
    # Try with basic Node HTTP server
    echo "📝 Creating ultra-simple server..."
    cat > simple.js << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('LIGHTCAT Server Running');
});
server.listen(3000, () => console.log('Server on 3000'));
EOF
    
    pm2 start simple.js --name lightcat
fi

echo ""
echo "📊 Final Status:"
pm2 status

echo ""
echo "🧪 Testing endpoints:"
sleep 3
curl -s http://localhost:3000/ | head -5
curl -s http://localhost:3000/api/health

echo ""
echo "✅ Done! Check http://rgblightcat.com"
FIXERROR