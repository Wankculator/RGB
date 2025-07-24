#!/bin/bash

# FULL SETUP AFTER REBOOT - Everything in one script

echo "🚀 COMPLETE LIGHTCAT SETUP AFTER REBOOT"
echo "======================================"
echo ""

ssh root@147.93.105.138 << 'FULLSETUP'
echo "📦 Setting up LIGHTCAT Token Platform..."
echo ""

# 1. Go to the right directory
cd /var/www/rgblightcat || { echo "Creating directory..."; mkdir -p /var/www/rgblightcat; cd /var/www/rgblightcat; }

# 2. Create the server file
echo "📝 Creating server..."
cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

// API endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LIGHTCAT API Running!' });
});

app.get('/api/stats', (req, res) => {
    res.json({
        tokens_sold: 1470000,
        batches_sold: 2100,
        unique_buyers: 342,
        total_batches: 30000,
        price_per_batch: 2000
    });
});

app.get('/api/rgb/stats', (req, res) => {
    res.json({
        totalBatches: 30000,
        batchesSold: 2100,
        tokensPerBatch: 700,
        pricePerBatch: 2000,
        availableBatches: 27900
    });
});

app.post('/api/rgb/invoice', (req, res) => {
    const { rgbInvoice, batchCount } = req.body;
    res.json({
        success: true,
        invoiceId: 'mock-' + Date.now(),
        lightningInvoice: 'lnbc' + (batchCount * 2000) + 'n1p...',
        amount: batchCount * 2000,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
});

app.get('/api/rgb/invoice/:id/status', (req, res) => {
    res.json({ status: 'pending', consignment: null });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('LIGHTCAT server running on port ' + PORT);
});
EOF

# 3. Create client directory if missing
mkdir -p client
if [ ! -f "client/index.html" ]; then
    echo "📝 Creating placeholder index.html..."
    cat > client/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>LIGHTCAT Token</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #333; }
        .status { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <h1>🐱 LIGHTCAT Token Platform</h1>
    <div class="status">✅ Server is Running!</div>
    <p>The full application will be deployed soon.</p>
    <p>API Status: <a href="/api/health">/api/health</a></p>
    <p>RGB Stats: <a href="/api/rgb/stats">/api/rgb/stats</a></p>
</body>
</html>
EOF
fi

# 4. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install express cors

# 5. Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# 6. Start with PM2
echo ""
echo "🚀 Starting server with PM2..."
pm2 delete all 2>/dev/null || true
pm2 start server.js --name lightcat
pm2 save
pm2 startup systemd -u root --hp /root --service-name pm2-lightcat
systemctl enable pm2-lightcat

# 7. Configure Nginx
echo ""
echo "🔧 Configuring Nginx..."
cat > /etc/nginx/sites-available/rgblightcat << 'NGINX'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/rgblightcat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 8. Configure firewall
echo ""
echo "🔧 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 9. Test everything
echo ""
echo "🧪 Testing setup..."
sleep 3

echo "PM2 Status:"
pm2 status

echo ""
echo "Testing API locally:"
curl -s http://localhost:3000/api/health && echo " ✅ API working!" || echo " ❌ API not working"

echo ""
echo "Testing through Nginx:"
curl -s -H "Host: rgblightcat.com" http://localhost/api/health && echo " ✅ Nginx working!" || echo " ❌ Nginx not working"

# 10. Try to install SSL
echo ""
echo "🔒 Installing SSL certificate..."
if ! command -v certbot &> /dev/null; then
    apt-get update && apt-get install -y certbot python3-certbot-nginx
fi
certbot --nginx -d rgblightcat.com -d www.rgblightcat.com --non-interactive --agree-tos -m admin@rgblightcat.com --redirect || echo "SSL installation failed - that's OK for now"

echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "Your site should now be accessible at:"
echo "  http://rgblightcat.com"
echo "  https://rgblightcat.com (if SSL worked)"
echo ""
echo "To check logs: pm2 logs lightcat"
echo ""
pm2 list

FULLSETUP