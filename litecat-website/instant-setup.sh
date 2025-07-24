#!/bin/bash

# LIGHTCAT Instant Setup - No npm required
# Gets everything running immediately

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}"
cat << "EOF"
  _     ___ _____ _____ ____    _  _____ 
 | |   |_ _|_   _| ____|/ ___|  / \|_   _|
 | |    | |  | | |  _| | |     / _ \ | |  
 | |___ | |  | | | |___| |___ / ___ \| |  
 |_____|___| |_| |_____|\____/_/   \_\_|  
                                          
       INSTANT SETUP - NO WAITING!
         🐱⚡ Ready in 30 seconds ⚡🐱
EOF
echo -e "${NC}"

echo -e "${BLUE}Setting up LIGHTCAT instantly...${NC}\n"

# 1. Create all directories
echo -n "Creating directories... "
mkdir -p server/{logs,uploads,certs,templates/email,routes,services,controllers,middleware,utils}
mkdir -p voltage-credentials rgb-credentials client/uploads database temp
mkdir -p client/{js/game,css,images,assets}
echo -e "${GREEN}✓${NC}"

# 2. Environment setup
echo -n "Setting up environment... "
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:8082
SUPABASE_URL=mock
SUPABASE_SERVICE_KEY=mock
SUPABASE_ANON_KEY=mock
BTC_WALLET_ADDRESS=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
RGB_MOCK_MODE=true
JWT_SECRET=dev-secret-123
ADMIN_API_KEY=dev-admin-123
EOF
fi
echo -e "${GREEN}✓${NC}"

# 3. Create minimal server without dependencies
echo -n "Creating server... "
cat > simple-api.js << 'EOF'
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Simple CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Mock data
const stats = {
  totalSold: 1470000,
  batchesSold: 2100,
  remainingBatches: 27900,
  uniqueBuyers: 420,
  percentSold: 7,
  mintClosed: false
};

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Routes
  if (pathname === '/health') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ status: 'ok', service: 'lightcat-api' }));
  }
  else if (pathname === '/api/rgb/stats') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ success: true, stats }));
  }
  else if (pathname === '/api/lightning/info') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      success: true,
      node: {
        alias: 'LIGHTCAT-DEV',
        identity_pubkey: 'mock_' + Date.now(),
        num_active_channels: 5,
        synced_to_chain: true,
        block_height: 820000
      },
      connected: false,
      mode: 'mock'
    }));
  }
  else if (pathname === '/api/rgb/invoice' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        invoiceId: 'INV-' + Date.now(),
        lightningInvoice: 'lnbc' + Math.random().toString(36).substring(7),
        amount: 2000,
        expiresAt: new Date(Date.now() + 900000).toISOString()
      }));
    });
  }
  else {
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🐱⚡ LIGHTCAT API running on http://localhost:${PORT}`);
});
EOF
echo -e "${GREEN}✓${NC}"

# 4. Create UI server
echo -n "Creating UI server... "
cat > serve-ui.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

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
echo -e "${GREEN}✓${NC}"

# 5. Create start/stop scripts
echo -n "Creating control scripts... "
cat > start-instant.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting LIGHTCAT (Instant Mode)..."

# Kill existing processes
pkill -f "node.*simple-api" 2>/dev/null
pkill -f "node.*serve-ui" 2>/dev/null
pkill -f "python.*8082" 2>/dev/null

# Start servers
node simple-api.js &
API_PID=$!

if [ -f "serve-ui.js" ]; then
    node serve-ui.js &
else
    cd client && python3 -m http.server 8082 &
    cd ..
fi
UI_PID=$!

echo ""
echo "✅ LIGHTCAT is running!"
echo ""
echo "🌐 UI:  http://localhost:8082"
echo "🔌 API: http://localhost:3000"
echo "📊 Stats: http://localhost:3000/api/rgb/stats"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $API_PID $UI_PID 2>/dev/null; echo 'Stopped'; exit" INT
wait
EOF

chmod +x start-instant.sh

cat > stop-instant.sh << 'EOF'
#!/bin/bash
pkill -f "node.*simple-api" 2>/dev/null
pkill -f "node.*serve-ui" 2>/dev/null
pkill -f "python.*8082" 2>/dev/null
echo "✅ LIGHTCAT stopped"
EOF

chmod +x stop-instant.sh
echo -e "${GREEN}✓${NC}"

# 6. SSL certificates
echo -n "Creating SSL certificates... "
if [ ! -f "server/certs/localhost.pem" ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout server/certs/localhost-key.pem \
        -out server/certs/localhost.pem \
        -subj "/CN=localhost" 2>/dev/null
fi
echo -e "${GREEN}✓${NC}"

# 7. Mock credentials
echo -n "Creating mock credentials... "
echo '{"assetId":"rgb1mock","mockMode":true}' > rgb-credentials/mock-wallet.json
touch voltage-credentials/.gitkeep
echo -e "${GREEN}✓${NC}"

# 8. Create status check script
echo -n "Creating status checker... "
cat > check-status.sh << 'EOF'
#!/bin/bash
echo "🔍 Checking LIGHTCAT status..."
echo ""

# Check API
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "✅ API Server: RUNNING"
else
    echo "❌ API Server: NOT RUNNING"
fi

# Check UI
if curl -s http://localhost:8082 >/dev/null 2>&1; then
    echo "✅ UI Server: RUNNING"
else
    echo "❌ UI Server: NOT RUNNING"
fi

# Check endpoints
echo ""
echo "📊 Testing endpoints:"
curl -s http://localhost:3000/api/rgb/stats | head -c 100
echo "..."
EOF

chmod +x check-status.sh
echo -e "${GREEN}✓${NC}"

# Summary
echo -e "\n${PURPLE}===============================================${NC}"
echo -e "${GREEN}✅ INSTANT SETUP COMPLETE!${NC}"
echo -e "${PURPLE}===============================================${NC}"

echo -e "\n${BLUE}Everything is ready to run!${NC}"
echo ""
echo "📁 Directories created"
echo "🔐 Environment configured"
echo "🚀 Servers ready"
echo "📜 Scripts created"
echo ""
echo -e "${YELLOW}To start LIGHTCAT:${NC}"
echo -e "   ${GREEN}./start-instant.sh${NC}"
echo ""
echo -e "${YELLOW}To check status:${NC}"
echo -e "   ${GREEN}./check-status.sh${NC}"
echo ""
echo -e "${YELLOW}To stop:${NC}"
echo -e "   ${GREEN}./stop-instant.sh${NC}"
echo ""
echo -e "${BLUE}No npm install needed! 🎉${NC}"

# Auto-start option
echo -e "\n${YELLOW}Start LIGHTCAT now? (y/n)${NC}"
read -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./start-instant.sh
else
    echo -e "${BLUE}Run ${GREEN}./start-instant.sh${BLUE} when ready!${NC}"
fi