// Enhanced API with RGB Testnet Support - Following CLAUDE.md
const express = require('express');
const cors = require('cors');
const https = require('https');
require('dotenv').config({ path: '.env.testnet' });

const app = express();
const PORT = process.env.PORT || 3000;

// Services
const rgbTestnetService = require('./server/services/rgbTestnetService');

// Middleware
app.use(cors());
app.use(express.json());

// BTCPay configuration
const BTCPAY_URL = process.env.BTCPAY_URL;
const BTCPAY_API_KEY = process.env.BTCPAY_API_KEY;
const BTCPAY_STORE_ID = process.env.BTCPAY_STORE_ID;
const USE_MOCK_RGB = process.env.USE_MOCK_RGB === 'true';
const USE_TESTNET = process.env.USE_TESTNET === 'true';

// Use the provided Basic Auth header directly
const BTCPAY_AUTH = 'Basic Qm9HQkx5R25IR3Y3N0hNYlZEWWRkVUxIMHJoaW9kN0hReWhrdkhRRFpiVQ==';

// Simple in-memory database
const database = {
    invoices: new Map(),
    gameScores: [],
    payments: []
};

console.log('RGB Testnet API Configuration:', {
    network: process.env.RGB_NETWORK,
    mockMode: USE_MOCK_RGB,
    testnet: USE_TESTNET,
    btcpay: BTCPAY_URL ? 'configured' : 'not configured'
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        btcpay: BTCPAY_URL ? 'configured' : 'not configured',
        mode: USE_MOCK_RGB ? 'mock' : 'live',
        network: USE_TESTNET ? 'testnet' : 'mainnet',
        database: 'in-memory'
    });
});

// RGB Stats endpoint
app.get('/api/rgb/stats', (req, res) => {
    res.json({
        totalSupply: 21000000,
        batchesAvailable: 29850,
        batchesSold: 150,
        pricePerBatch: 2000,
        tokensPerBatch: 700,
        network: USE_TESTNET ? 'testnet' : 'mainnet'
    });
});

// Create Lightning invoice with RGB validation
app.post('/api/rgb/invoice', async (req, res) => {
    const { rgbInvoice, batchCount } = req.body;
    
    if (!rgbInvoice || !batchCount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // CRITICAL: Validate RGB invoice format per CLAUDE.md
    if (!rgbTestnetService.validateRGBInvoice(rgbInvoice)) {
        return res.status(400).json({ 
            error: 'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"' 
        });
    }
    
    // Validate batch count
    const numBatches = parseInt(batchCount);
    if (isNaN(numBatches) || numBatches < 1 || numBatches > 10) {
        return res.status(400).json({ error: 'Invalid batch count (1-10)' });
    }
    
    const amount = numBatches * 2000; // 2000 sats per batch
    const invoiceId = 'inv_' + Date.now();
    
    // Store invoice data
    const invoiceData = {
        id: invoiceId,
        rgbInvoice,
        batchCount: numBatches,
        amount,
        status: 'pending',
        created_at: new Date().toISOString(),
        network: USE_TESTNET ? 'testnet' : 'mainnet'
    };
    
    database.invoices.set(invoiceId, invoiceData);
    
    if (USE_MOCK_RGB && USE_TESTNET) {
        // Mock response for testnet
        return res.json({
            success: true,
            invoiceId: invoiceId,
            lightningInvoice: 'lnbc' + amount + 'testnetmockinvoice',
            amount: amount,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            network: 'testnet'
        });
    }
    
    // Real BTCPay integration continues...
    try {
        const btcpayData = {
            price: amount / 100000000,
            currency: 'BTC',
            orderId: invoiceId,
            itemDesc: `LIGHTCAT Token Purchase (Testnet) - ${numBatches} batches`,
            notificationURL: 'https://rgblightcat.com/api/webhooks/btcpay',
            redirectURL: 'https://rgblightcat.com/purchase/success',
            posData: JSON.stringify({
                rgbInvoice: rgbInvoice,
                batchCount: numBatches,
                network: 'testnet'
            })
        };
        
        console.log('Creating BTCPay testnet invoice:', btcpayData);
        
        // BTCPay invoice creation would go here...
        
    } catch (error) {
        console.error('Invoice creation error:', error.message);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// Check invoice status
app.get('/api/rgb/invoice/:id/status', async (req, res) => {
    const { id } = req.params;
    const invoice = database.invoices.get(id.startsWith('inv_') ? id : 'inv_' + id);
    
    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Mock auto-pays after 10 seconds for testing
    if (USE_MOCK_RGB && USE_TESTNET) {
        const created = new Date(invoice.created_at).getTime();
        const elapsed = Date.now() - created;
        
        if (elapsed > 10000 && invoice.status === 'pending') {
            invoice.status = 'paid';
            
            // Generate testnet consignment
            try {
                const consignment = await rgbTestnetService.generateConsignment({
                    rgbInvoice: invoice.rgbInvoice,
                    amount: invoice.batchCount,
                    invoiceId: invoice.id
                });
                
                invoice.consignment = consignment;
                invoice.status = 'delivered';
                database.invoices.set(id, invoice);
                
                return res.json({ 
                    status: 'delivered',
                    consignment: consignment,
                    network: 'testnet'
                });
            } catch (error) {
                console.error('Consignment generation error:', error);
                return res.json({ status: 'paid' });
            }
        }
    }
    
    return res.json({ 
        status: invoice.status,
        consignment: invoice.consignment || null
    });
});

// Save game score
app.post('/api/game/score', async (req, res) => {
    const { walletAddress, score, tier, maxBatches } = req.body;
    
    if (!walletAddress || !score) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const gameScore = {
        id: 'score_' + Date.now(),
        wallet_address: walletAddress,
        score,
        tier,
        max_batches: maxBatches,
        created_at: new Date().toISOString()
    };
    
    database.gameScores.push(gameScore);
    
    // Keep only last 100 scores
    if (database.gameScores.length > 100) {
        database.gameScores = database.gameScores.slice(-100);
    }
    
    res.json({
        success: true,
        score: gameScore
    });
});

// Get top scores
app.get('/api/game/top-scores', (req, res) => {
    const topScores = [...database.gameScores]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    
    res.json({
        success: true,
        scores: topScores
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`LIGHTCAT Testnet API running on port ${PORT}`);
    console.log(`Network: ${USE_TESTNET ? 'TESTNET' : 'MAINNET'}`);
    console.log(`RGB Mode: ${USE_MOCK_RGB ? 'MOCK' : 'LIVE'}`);
    console.log(`BTCPay: ${BTCPAY_URL ? 'Connected' : 'Not configured'}`);
});
