const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

// Create server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Default to index.html for root
  let filePath = req.url === '/' ? '/client/index.html' : req.url;
  
  // Special handling for logo.jpg
  if (req.url === '/logo.jpg') {
    filePath = '/client/logo.jpg';
  } else if (!filePath.startsWith('/client') && req.url !== '/') {
    filePath = `/client${req.url}`;
  }
  
  // Security check - prevent directory traversal
  if (filePath.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  // Handle API endpoints (mock responses)
  if (req.url.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/api/sales/stats') {
      res.writeHead(200);
      res.end(JSON.stringify({
        totalSold: 1250,
        remaining: 27250,
        percentage: 4.38
      }));
      return;
    }
    
    if (req.url === '/api/game/leaderboard') {
      res.writeHead(200);
      res.end(JSON.stringify({
        leaderboard: [
          { wallet: 'bc1q...abc', score: 45, tier: 3 },
          { wallet: 'bc1q...def', score: 32, tier: 3 },
          { wallet: 'bc1q...ghi', score: 28, tier: 3 },
          { wallet: 'bc1q...jkl', score: 19, tier: 2 },
          { wallet: 'bc1q...mno', score: 15, tier: 2 }
        ]
      }));
      return;
    }
    
    // Default API response
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', message: 'Demo API endpoint' }));
    return;
  }
  
  // Construct full file path
  const fullPath = path.join(__dirname, filePath);
  
  // Check if file exists
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      // Try without /client prefix for assets
      const altPath = path.join(__dirname, req.url);
      fs.access(altPath, fs.constants.F_OK, (err2) => {
        if (err2) {
          res.writeHead(404);
          res.end('File not found');
        } else {
          serveFile(altPath, res);
        }
      });
    } else {
      serveFile(fullPath, res);
    }
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error reading file');
      return;
    }
    
    res.setHeader('Content-Type', mimeType);
    res.writeHead(200);
    res.end(data);
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🐱⚡ Litecat Token Demo Server Running!                  ║
║                                                            ║
║   🌐 Local URL: http://localhost:${PORT}                       ║
║   🌐 Network URL: http://127.0.0.1:${PORT}                     ║
║                                                            ║
║   📁 Serving from: ${__dirname}
║                                                            ║
║   Press Ctrl+C to stop the server                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  // Try to open browser
  const { exec } = require('child_process');
  const os = process.platform;
  
  const url = `http://localhost:${PORT}`;
  
  if (os === 'win32') {
    exec(`start ${url}`);
  } else if (os === 'darwin') {
    exec(`open ${url}`);
  } else {
    exec(`xdg-open ${url}`);
  }
});