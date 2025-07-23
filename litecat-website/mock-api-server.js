// Mock API Server for LIGHTCAT Testing
// Following CLAUDE.md specifications

const http = require('http');
const url = require('url');

// Mock data storage
const invoices = new Map();
const payments = new Map();

// Helper to generate mock Lightning invoice
function generateLightningInvoice(amount) {
  const prefix = 'lnbc';
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}${amount}n1${random}`;
}

// Helper to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Request handler
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Health check endpoint
  if (path === '/health' && method === 'GET') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ status: 'ok', service: 'mock-api', timestamp: new Date().toISOString() }));
    return;
  }

  // RGB Stats endpoint
  if (path === '/api/rgb/stats' && method === 'GET') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      success: true,
      stats: {
        batchesSold: 2100,
        batchesRemaining: 27900,
        tokensSold: 1470000,
        uniqueBuyers: 42,
        currentBatchPrice: 2000,
        lastSaleTime: new Date(Date.now() - 300000).toISOString()
      }
    }));
    return;
  }

  // Create RGB Invoice endpoint
  if (path === '/api/rgb/invoice' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Validate RGB invoice format
        if (!data.rgbInvoice || (!data.rgbInvoice.startsWith('rgb:') && !data.rgbInvoice.includes('utxob:'))) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ success: false, error: 'Invalid RGB invoice format' }));
          return;
        }

        // Validate batch count
        let batchCount = parseInt(data.batchCount);
        
        // Default to 1 if not provided or NaN
        if (data.batchCount === undefined || data.batchCount === null || data.batchCount === '') {
          batchCount = 1;
        } else if (isNaN(batchCount) || batchCount < 1) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ success: false, error: 'Minimum 1 batch required' }));
          return;
        }

        // Validate tier limits
        const tierLimits = {
          bronze: 5,
          silver: 8,
          gold: 10
        };
        const maxBatches = data.tier ? tierLimits[data.tier.toLowerCase()] : 5;
        if (batchCount > maxBatches) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ success: false, error: `Maximum ${maxBatches} batches allowed${data.tier ? ' for ' + data.tier + ' tier' : ''}` }));
          return;
        }

        // Generate invoice
        const invoiceId = generateUUID();
        const amount = batchCount * 2000;
        const lightningInvoice = generateLightningInvoice(amount);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store invoice
        invoices.set(invoiceId, {
          id: invoiceId,
          rgbInvoice: data.rgbInvoice,
          email: data.email,
          batchCount: batchCount,
          amount,
          lightningInvoice,
          status: 'pending',
          expiresAt,
          createdAt: new Date()
        });

        // Response matching CLAUDE.md spec
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          invoiceId,
          lightningInvoice,
          amount,
          expiresAt: expiresAt.toISOString()
        }));

        // Simulate payment after 5 seconds (for testing)
        setTimeout(() => {
          const invoice = invoices.get(invoiceId);
          if (invoice && invoice.status === 'pending') {
            invoice.status = 'paid';
            payments.set(invoiceId, {
              invoiceId,
              paidAt: new Date(),
              amount: invoice.amount,
              consignment: Buffer.from(`RGB_CONSIGNMENT_${invoiceId}_${invoice.batchCount}x700_TOKENS`).toString('base64')
            });
          }
        }, 5000);

      } catch (error) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
      }
    });
    return;
  }

  // Check payment status endpoint
  if (path.match(/^\/api\/rgb\/invoice\/([^\/]+)\/status$/) && method === 'GET') {
    const invoiceId = path.match(/^\/api\/rgb\/invoice\/([^\/]+)\/status$/)[1];
    const invoice = invoices.get(invoiceId);
    
    if (!invoice) {
      res.writeHead(404, corsHeaders);
      res.end(JSON.stringify({ success: false, error: 'Invoice not found' }));
      return;
    }

    // Check if expired
    if (new Date() > invoice.expiresAt && invoice.status === 'pending') {
      invoice.status = 'expired';
    }

    const payment = payments.get(invoiceId);
    
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      success: true,
      status: invoice.status,
      consignment: payment ? payment.consignment : null
    }));
    return;
  }

  // Download consignment endpoint
  if (path.match(/^\/api\/rgb\/download\/([^\/]+)$/) && method === 'GET') {
    const invoiceId = path.match(/^\/api\/rgb\/download\/([^\/]+)$/)[1];
    const payment = payments.get(invoiceId);
    
    if (!payment) {
      res.writeHead(404, corsHeaders);
      res.end(JSON.stringify({ success: false, error: 'Payment not found' }));
      return;
    }

    // Return consignment file
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="lightcat_${invoiceId}.rgbc"`
    };
    
    res.writeHead(200, headers);
    res.end(Buffer.from(payment.consignment, 'base64'));
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, corsHeaders);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`
🚀 Mock API Server Running!
================================
✅ Health: http://localhost:${PORT}/health
✅ Stats: http://localhost:${PORT}/api/rgb/stats
✅ Create Invoice: POST http://localhost:${PORT}/api/rgb/invoice
✅ Check Status: GET http://localhost:${PORT}/api/rgb/invoice/:id/status
✅ Download: GET http://localhost:${PORT}/api/rgb/download/:id

💡 Payments auto-complete after 5 seconds for testing
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down mock API server...');
  server.close();
  process.exit(0);
});