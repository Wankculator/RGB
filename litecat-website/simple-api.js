const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Simple CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Mock data
const stats = {
  totalSold: 1470000,
  batchesSold: 2100,
  remainingBatches: 27900,
  uniqueBuyers: 420,
  percentSold: 7,
  mintClosed: false
};

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Routes
  if (pathname === '/health') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ status: 'ok', service: 'lightcat-api' }));
  }
  else if (pathname === '/api/rgb/stats') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ success: true, stats }));
  }
  else if (pathname === '/api/lightning/info') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      success: true,
      node: {
        alias: 'LIGHTCAT-DEV',
        identity_pubkey: 'mock_' + Date.now(),
        num_active_channels: 5,
        synced_to_chain: true,
        block_height: 820000
      },
      connected: false,
      mode: 'mock'
    }));
  }
  else if (pathname === '/api/rgb/invoice' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        invoiceId: 'INV-' + Date.now(),
        lightningInvoice: 'lnbc' + Math.random().toString(36).substring(7),
        amount: 2000,
        expiresAt: new Date(Date.now() + 900000).toISOString()
      }));
    });
  }
  else {
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🐱⚡ LIGHTCAT API running on http://localhost:${PORT}`);
});
