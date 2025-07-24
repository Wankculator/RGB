#!/bin/bash

ssh root@147.93.105.138 << 'EOF'
cd /var/www/rgblightcat
pm2 delete all
cat > server.js << 'SERVEREOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

http.createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: 'ok'}));
  } else if (req.url === '/api/rgb/stats') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({totalBatches: 30000, batchesSold: 2100, pricePerBatch: 2000}));
  } else if (req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h1>LIGHTCAT Token Platform</h1><p>Server Running!</p><a href="/api/health">API Health</a>');
  } else {
    const file = path.join(__dirname, 'client', req.url);
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200);
        res.end(data);
      }
    });
  }
}).listen(3000, () => console.log('Server on 3000'));
SERVEREOF

pm2 start server.js --name lightcat
pm2 save
echo "DONE! Check http://rgblightcat.com"
pm2 status
EOF