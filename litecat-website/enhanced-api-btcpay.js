const express = require('express');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// BTCPay configuration
const BTCPAY_URL = process.env.BTCPAY_URL;
const BTCPAY_API_KEY = process.env.BTCPAY_API_KEY;
const BTCPAY_STORE_ID = process.env.BTCPAY_STORE_ID;
const USE_MOCK = process.env.USE_MOCK_LIGHTNING === 'true';

// Use the provided Basic Auth header directly
const BTCPAY_AUTH = 'Basic Qm9HQkx5R25IR3Y3N0hNYlZEWWRkVUxIMHJoaW9kN0hReWhrdkhRRFpiVQ==';

console.log('BTCPay Config:', {
  url: BTCPAY_URL,
  storeId: BTCPAY_STORE_ID,
  authType: 'Legacy API Basic Auth',
  mockMode: USE_MOCK
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    btcpay: BTCPAY_URL ? 'configured' : 'not configured',
    mode: USE_MOCK ? 'mock' : 'live'
  });
});

// RGB Stats endpoint
app.get('/api/rgb/stats', (req, res) => {
  res.json({
    totalSupply: 21000000,
    batchesAvailable: 29850,
    batchesSold: 150,
    pricePerBatch: 2000,
    tokensPerBatch: 700
  });
});

// Create Lightning invoice
app.post('/api/rgb/invoice', async (req, res) => {
  const { rgbInvoice, batchCount } = req.body;
  
  if (!rgbInvoice || !batchCount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate RGB invoice format
  if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {
    return res.status(400).json({ error: 'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"' });
  }
  
  const amount = batchCount * 2000; // 2000 sats per batch
  const invoiceId = 'inv_' + Date.now();
  
  if (USE_MOCK) {
    // Mock response
    return res.json({
      success: true,
      invoiceId: invoiceId,
      lightningInvoice: 'lnbc' + amount + 'mockinvoice',
      amount: amount,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
  }
  
  // Real BTCPay integration with Legacy API
  try {
    const invoiceData = {
      price: amount / 100000000, // Convert sats to BTC
      currency: 'BTC',
      orderId: invoiceId,
      itemDesc: `LIGHTCAT Token Purchase - ${batchCount} batches`,
      notificationURL: 'https://rgblightcat.com/api/webhooks/btcpay',
      redirectURL: 'https://rgblightcat.com/purchase/success',
      posData: JSON.stringify({
        rgbInvoice: rgbInvoice,
        batchCount: batchCount
      })
    };
    
    console.log('Creating BTCPay invoice:', invoiceData);
    
    const response = await createBTCPayInvoice(invoiceData);
    
    res.json({
      success: true,
      invoiceId: response.id,
      lightningInvoice: response.paymentCodes?.BTC_LightningLike?.lightning || response.url,
      amount: amount,
      expiresAt: new Date(response.expirationTime).toISOString(),
      checkoutUrl: response.url
    });
    
  } catch (error) {
    console.error('Invoice creation error:', error.message);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Check invoice status
app.get('/api/rgb/invoice/:id/status', async (req, res) => {
  const { id } = req.params;
  
  if (USE_MOCK || id.startsWith('inv_')) {
    // Mock auto-pays after 10 seconds
    const created = parseInt(id.split('_')[1]);
    const elapsed = Date.now() - created;
    
    if (elapsed > 10000) {
      return res.json({ 
        status: 'paid',
        consignment: 'base64mockrgbconsignmentfile'
      });
    }
    return res.json({ status: 'pending' });
  }
  
  // Real BTCPay status check
  try {
    const status = await checkBTCPayInvoice(id);
    res.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// BTCPay helper functions using Legacy API
async function createBTCPayInvoice(data) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BTCPAY_URL}/invoices`);
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': BTCPAY_AUTH,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log('BTCPay response:', res.statusCode, responseData.substring(0, 200));
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed.data || parsed);
          } catch (e) {
            reject(new Error(`Parse error: ${responseData}`));
          }
        } else {
          reject(new Error(`BTCPay error: ${res.statusCode} - ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function checkBTCPayInvoice(invoiceId) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BTCPAY_URL}/invoices/${invoiceId}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': BTCPAY_AUTH,
        'Content-Type': 'application/json'
      }
    };
    
    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          const invoice = parsed.data || parsed;
          const isPaid = invoice.status === 'complete' || 
                        invoice.status === 'confirmed' || 
                        invoice.status === 'paid';
          resolve({ 
            status: isPaid ? 'paid' : 'pending',
            consignment: isPaid ? 'base64rgbconsignmentfile' : null
          });
        } else {
          reject(new Error(`BTCPay error: ${res.statusCode}`));
        }
      });
    }).on('error', reject).end();
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LIGHTCAT API running on port ${PORT}`);
  console.log(`BTCPay: ${BTCPAY_URL ? 'Connected' : 'Not configured'}`);
  console.log(`Mode: ${USE_MOCK ? 'Mock' : 'Live'}`);
  console.log(`Auth: Using Legacy API with Basic Auth`);
});