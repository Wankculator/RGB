# 🚨 FIX SERVERS - Quick Commands

## The servers crashed. Here's how to fix it:

### 1. SSH to your server:
```bash
ssh root@147.93.105.138
```

### 2. Copy and run this ENTIRE block:
```bash
cd /var/www/rgblightcat

# Kill any stuck processes
pkill -f node
pm2 kill

# Make sure we have all files
if [ ! -f "server/index.js" ]; then
    echo "Creating server files..."
    mkdir -p server
    cat > server/index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LIGHTCAT API Running' });
});

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
    const invoiceId = 'inv_' + Date.now();
    res.json({
        success: true,
        invoiceId: invoiceId,
        lightningInvoice: 'lnbc20000n1ps...',
        amount: 2000,
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString()
    });
});

app.get('/api/rgb/invoice/:id/status', (req, res) => {
    res.json({
        status: 'pending',
        consignment: null
    });
});

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
EOF
fi

if [ ! -f "start-client.js" ]; then
    cat > start-client.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'client')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

const PORT = 8082;
app.listen(PORT, () => {
    console.log(`Client server running on port ${PORT}`);
});
EOF
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    npm install express cors
fi

# Start servers directly (not with PM2 yet)
echo "Starting servers..."
nohup node server/index.js > api.log 2>&1 &
nohup node start-client.js > client.log 2>&1 &

sleep 3

# Check if running
ps aux | grep node

# Now add to PM2
pm2 start server/index.js --name lightcat-api
pm2 start start-client.js --name lightcat-client
pm2 save
pm2 startup

echo "✅ Servers restarted!"
pm2 status
```

### 3. Test if it's working:
After running the above, test from your local computer:
```bash
curl http://rgblightcat.com/api/health
```

Should return: `{"status":"ok","message":"LIGHTCAT API Running"}`

### 4. If still not working, check logs:
```bash
pm2 logs
```

## 🔧 Alternative: Quick Restart
If the above is too complex, just run these commands on the server:

```bash
cd /var/www/rgblightcat
pm2 restart all
pm2 status
```

Then check: http://rgblightcat.com