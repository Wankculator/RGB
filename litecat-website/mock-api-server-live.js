// Enhanced Mock API Server with Live WebSocket Updates
// Following CLAUDE.md specifications

const http = require('http');
const url = require('url');
const WebSocket = require('ws');

// Mock data storage
const invoices = new Map();
const payments = new Map();
let totalBatchesSold = 2100; // Starting from existing pre-allocated sales

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

// Create HTTP server
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
    res.end(JSON.stringify({ status: 'ok', service: 'mock-api-live', timestamp: new Date().toISOString() }));
    return;
  }

  // RGB Stats endpoint
  if (path === '/api/rgb/stats' && method === 'GET') {
    const totalBatches = 27900;
    const remainingBatches = totalBatches - totalBatchesSold;
    const percentSold = ((totalBatchesSold / totalBatches) * 100).toFixed(2);
    
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      success: true,
      stats: {
        batchesSold: totalBatchesSold,
        batchesRemaining: remainingBatches,
        tokensSold: totalBatchesSold * 700,
        uniqueBuyers: Math.floor(totalBatchesSold / 50),
        currentBatchPrice: 2000,
        lastSaleTime: new Date().toISOString(),
        percentSold: percentSold
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
            
            // Update total and broadcast
            totalBatchesSold += invoice.batchCount;
            broadcastSalesUpdate(invoice.batchCount);
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

  // Recent purchases endpoint
  if (path === '/api/rgb/recent-purchases' && method === 'GET') {
    const recentPurchases = Array.from(payments.values())
      .slice(-10)
      .reverse()
      .map(p => {
        const invoice = invoices.get(p.invoiceId);
        return {
          batchCount: invoice.batchCount,
          timestamp: p.paidAt.toISOString(),
          tokens: invoice.batchCount * 700
        };
      });
    
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify(recentPurchases));
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

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Broadcast sales update to all connected clients
function broadcastSalesUpdate(newBatches) {
  const totalBatches = 27900;
  const remainingBatches = totalBatches - totalBatchesSold;
  const percentSold = ((totalBatchesSold / totalBatches) * 100).toFixed(2);
  
  const updateMessage = {
    type: 'sales:update',
    data: {
      totalBatchesSold: totalBatchesSold,
      totalTokensSold: totalBatchesSold * 700,
      remainingBatches: remainingBatches,
      percentSold: percentSold,
      latestPurchase: {
        batchCount: newBatches,
        tokens: newBatches * 700,
        timestamp: new Date().toISOString()
      }
    }
  };
  
  // Send to all connected clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(updateMessage));
    }
  });
  
  console.log(`📢 Broadcasted sales update: ${newBatches} batches sold (Total: ${totalBatchesSold})`);
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  
  // Send initial stats on connection
  const totalBatches = 27900;
  const remainingBatches = totalBatches - totalBatchesSold;
  const percentSold = ((totalBatchesSold / totalBatches) * 100).toFixed(2);
  
  const welcomeMessage = {
    type: 'sales:update',
    data: {
      totalBatchesSold: totalBatchesSold,
      totalTokensSold: totalBatchesSold * 700,
      remainingBatches: remainingBatches,
      percentSold: percentSold
    }
  };
  
  ws.send(JSON.stringify(welcomeMessage));
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`
🚀 Enhanced Mock API Server with Live Updates!
=============================================
✅ HTTP API: http://localhost:${PORT}
✅ WebSocket: ws://localhost:${PORT}
✅ Health: http://localhost:${PORT}/health
✅ Stats: http://localhost:${PORT}/api/rgb/stats
✅ Create Invoice: POST http://localhost:${PORT}/api/rgb/invoice
✅ Check Status: GET http://localhost:${PORT}/api/rgb/invoice/:id/status
✅ Recent Purchases: GET http://localhost:${PORT}/api/rgb/recent-purchases
✅ Download: GET http://localhost:${PORT}/api/rgb/download/:id

💡 Features:
   - Payments auto-complete after 5 seconds
   - Live progress bar updates via WebSocket
   - Real-time purchase notifications
   - Batch validation enforced
   
📊 Current Stats:
   - Batches Sold: ${totalBatchesSold}
   - Progress: ${((totalBatchesSold / 27900) * 100).toFixed(2)}%
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down enhanced mock API server...');
  wss.clients.forEach(client => client.close());
  server.close();
  process.exit(0);
});