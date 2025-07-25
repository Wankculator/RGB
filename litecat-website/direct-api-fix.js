// Direct API Fix - Patches the production API immediately
const https = require('https');

console.log('🔧 Direct RGB Validation Fix');
console.log('===========================');

// This creates a patched API that proxies to the real one
// but adds validation

const express = require('express');
const app = express();
app.use(express.json());

const REAL_API = 'https://rgblightcat.com';

// Proxy all requests except RGB invoice
app.all('*', async (req, res) => {
    const path = req.path;
    
    // Special handling for RGB invoice endpoint
    if (path === '/api/rgb/invoice' && req.method === 'POST') {
        const { rgbInvoice, batchCount } = req.body;
        
        // ADD VALIDATION HERE
        if (!rgbInvoice || !batchCount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // CRITICAL RGB VALIDATION
        if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {
            return res.status(400).json({ 
                error: 'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"' 
            });
        }
    }
    
    // Proxy to real API
    const options = {
        hostname: 'rgblightcat.com',
        path: req.path,
        method: req.method,
        headers: {
            ...req.headers,
            host: 'rgblightcat.com'
        }
    };
    
    const proxy = https.request(options, (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
    });
    
    if (req.body && Object.keys(req.body).length > 0) {
        proxy.write(JSON.stringify(req.body));
    }
    
    proxy.end();
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Validation proxy running on port ${PORT}`);
    console.log('');
    console.log('Test it:');
    console.log(`curl -X POST http://localhost:${PORT}/api/rgb/invoice -H "Content-Type: application/json" -d '{"rgbInvoice": "invalid", "batchCount": 1}'`);
});