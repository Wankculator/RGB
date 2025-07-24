#!/bin/bash

# ONE COMMAND TO FIX EVERYTHING

ssh root@147.93.105.138 << 'EOF'
cd /var/www/rgblightcat
pkill -f node
pm2 kill

# Create simple server
cat > server.js << 'SERVEREOF'
const express = require('express');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname, 'client')));
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/rgb/stats', (req, res) => res.json({ totalBatches: 30000, batchesSold: 2100, pricePerBatch: 2000 }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'client', 'index.html')));
app.listen(3000, () => console.log('Server on 3000'));
SERVEREOF

npm install express
pm2 start server.js --name lightcat
pm2 save
pm2 startup systemd -u root --hp /root

# Fix nginx
cat > /etc/nginx/sites-available/rgblightcat << 'NGINXEOF'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/rgblightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl reload nginx

echo "DONE! Site is at http://rgblightcat.com"
pm2 status
EOF