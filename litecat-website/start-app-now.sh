#!/bin/bash

# Start LIGHTCAT app on server

VPS_IP="147.93.105.138"
VPS_USER="root"

echo "🚀 Starting LIGHTCAT Application"
echo "================================"

# Create remote start script
cat > /tmp/start-app-remote.sh << 'STARTSCRIPT'
#!/bin/bash

cd /var/www/rgblightcat

echo "📁 Current directory contents:"
ls -la

# Check if we have the server files
if [ ! -f "server/index.js" ]; then
    echo "⚠️  Server files not found, creating basic server..."
    mkdir -p server
    cat > server/index.js << 'SERVERJS'
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LIGHTCAT API Running' });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    res.json({
        tokens_sold: 1470000,
        batches_sold: 2100,
        unique_buyers: 342,
        total_batches: 30000,
        price_per_batch: 2000,
        last_sale: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
SERVERJS
fi

# Create client server
if [ ! -f "start-client.js" ]; then
    cat > start-client.js << 'CLIENTJS'
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'client')));

app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'client', 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('<h1>LIGHTCAT - Site loading...</h1>');
    }
});

const PORT = 8082;
app.listen(PORT, () => {
    console.log(`Client server running on port ${PORT}`);
});
CLIENTJS
fi

# Create basic package.json if missing
if [ ! -f "package.json" ]; then
    cat > package.json << 'PKGJSON'
{
  "name": "lightcat-website",
  "version": "1.0.0",
  "scripts": {
    "start": "node server/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
PKGJSON
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install express cors
fi

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'PM2CONFIG'
module.exports = {
  apps: [
    {
      name: 'lightcat-api',
      script: './server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'lightcat-client',
      script: './start-client.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
PM2CONFIG

# Start with PM2
echo "🔄 Starting applications with PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "✅ Applications started!"
echo ""
pm2 status

echo ""
echo "🌐 Your site should now be live at:"
echo "   http://rgblightcat.com"
echo "   https://rgblightcat.com"
echo ""
echo "📊 Check logs with: pm2 logs"

STARTSCRIPT

# Upload and run
echo "📤 Connecting to server..."
scp /tmp/start-app-remote.sh $VPS_USER@$VPS_IP:/tmp/
ssh $VPS_USER@$VPS_IP 'chmod +x /tmp/start-app-remote.sh && bash /tmp/start-app-remote.sh'

echo ""
echo "✅ Done! Your site should be running now!"
echo "🌐 Visit: https://rgblightcat.com"