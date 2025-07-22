const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  let filePath = req.url === '/' ? '/client/index.html' : req.url;
  
  // Handle logo.jpg specifically
  if (req.url === '/logo.jpg') {
    filePath = '/client/logo.jpg';
  }
  
  // Add /client prefix if not already there
  if (!filePath.startsWith('/client') && filePath !== '/') {
    filePath = '/client' + filePath;
  }
  
  if (filePath.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const fullPath = path.join(__dirname, filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      console.log('File not found:', fullPath);
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🐱⚡ Litecat Token Server Running!                       ║
║                                                            ║
║   Open your browser and visit:                            ║
║   http://localhost:${PORT}                                     ║
║                                                            ║
║   Press Ctrl+C to stop the server                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});