#!/bin/bash
# ONE COMMAND FIX - Upload this to VPS and run it

cd /var/www/rgblightcat && pm2 delete all 2>/dev/null; cat > serve-ui.js << 'EOF'
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
  '.svg': 'image/svg+xml'
};
http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'client', req.url === '/' ? 'index.html' : req.url);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(__dirname, 'client', 'index.html'), (error, content) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content || 'Error', 'utf-8');
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}).listen(8082, () => console.log('UI on 8082'));
EOF
pm2 start server/app.js --name api && pm2 start serve-ui.js --name ui && pm2 save && sleep 3 && pm2 status && echo "✅ Fixed! Visit http://rgblightcat.com"