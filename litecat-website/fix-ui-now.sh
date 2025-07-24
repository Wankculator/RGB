#!/bin/bash
# Quick UI fix script

cd /var/www/rgblightcat
pm2 delete ui 2>/dev/null

# Create simple working UI server
cat > serve-ui.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;
const server = http.createServer((req, res) => {
    let filePath = './client' + (req.url === '/' ? '/index.html' : req.url);
    filePath = path.normalize(filePath);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
        } else {
            let contentType = 'text/html';
            if (filePath.endsWith('.js')) contentType = 'text/javascript';
            else if (filePath.endsWith('.css')) contentType = 'text/css';
            else if (filePath.endsWith('.json')) contentType = 'application/json';
            else if (filePath.endsWith('.png')) contentType = 'image/png';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log('UI server running on port ' + PORT);
});
EOF

# Start it
pm2 start serve-ui.js --name ui
pm2 save
pm2 status

# Test it
sleep 3
curl -s http://localhost:8082 > /dev/null && echo "✅ UI Fixed!" || echo "❌ UI Still broken"
curl -s http://localhost:3000/health > /dev/null && echo "✅ API Working!" || echo "❌ API broken"

echo "Done! Check http://rgblightcat.com"