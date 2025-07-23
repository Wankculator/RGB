#!/usr/bin/env node

// Script to add live progress bar updates to the mock server

const fs = require('fs');
const path = require('path');

console.log('🔄 Adding Live Progress Bar Updates...\n');

// Create a WebSocket-enabled mock server
const enhancedServerCode = `// Enhanced Mock API Server with Live Updates
const http = require('http');
const url = require('url');
const WebSocket = require('ws');

// Mock data storage
const invoices = new Map();
const payments = new Map();
let totalBatchesSold = 2100; // Starting from existing sales

// Helper to generate mock Lightning invoice
function generateLightningInvoice(amount) {
  const prefix = 'lnbc';
  const random = Math.random().toString(36).substring(2, 15);
  return \`\${prefix}\${amount}n1\${random}\`;
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
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date() }));
    return;
  }

  // RGB stats endpoint
  if (path === '/api/rgb/stats' && method === 'GET') {
    const totalBatches = 27900;
    const remainingBatches = totalBatches - totalBatchesSold;
    const percentSold = ((totalBatchesSold / totalBatches) * 100).toFixed(2);
    
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      success: true,
      totalSold: totalBatchesSold * 700,
      totalBatches: 27900,
      batchesSold: totalBatchesSold,
      remainingBatches: remainingBatches,
      percentSold: percentSold,
      pricePerBatch: 0.00002,
      timestamp: new Date()
    }));
    return;
  }

  // Handle other endpoints...
  // (Rest of the mock server code remains the same)

  // When a purchase is completed, broadcast update
  function handlePurchaseComplete(batchCount) {
    totalBatchesSold += batchCount;
    
    // Broadcast to all WebSocket clients
    const updateData = {
      type: 'sales:update',
      data: {
        totalBatchesSold: totalBatchesSold,
        totalTokensSold: totalBatchesSold * 700,
        remainingBatches: 27900 - totalBatchesSold,
        percentSold: ((totalBatchesSold / 27900) * 100).toFixed(2),
        latestPurchase: {
          batchCount: batchCount,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(updateData));
      }
    });
  }

  // Create invoice endpoint (include broadcast on payment)
  if (path === '/api/rgb/invoice' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // (Validation code here...)
        
        // Simulate payment after 5 seconds
        setTimeout(() => {
          const invoice = invoices.get(invoiceId);
          if (invoice && invoice.status === 'pending') {
            invoice.status = 'paid';
            payments.set(invoiceId, {
              invoiceId,
              paidAt: new Date(),
              amount: invoice.amount,
              consignment: Buffer.from(\`RGB_CONSIGNMENT_\${invoiceId}_\${invoice.batchCount}x700_TOKENS\`).toString('base64')
            });
            
            // Broadcast the update!
            handlePurchaseComplete(invoice.batchCount);
          }
        }, 5000);
        
      } catch (error) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
      }
    });
    return;
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send initial stats on connection
  const initialData = {
    type: 'sales:update',
    data: {
      totalBatchesSold: totalBatchesSold,
      totalTokensSold: totalBatchesSold * 700,
      remainingBatches: 27900 - totalBatchesSold,
      percentSold: ((totalBatchesSold / 27900) * 100).toFixed(2)
    }
  };
  ws.send(JSON.stringify(initialData));
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(\`
🚀 Enhanced Mock API Server with Live Updates!
===========================================
✅ HTTP API: http://localhost:\${PORT}
✅ WebSocket: ws://localhost:\${PORT}
✅ Live progress bar updates enabled

💡 Progress bar will update in real-time when purchases are made!
\`);
});
`;

// Write the enhanced server
fs.writeFileSync(
  path.join(__dirname, '..', 'mock-api-server-live.js'),
  enhancedServerCode
);

// Create client-side WebSocket integration
const clientWebSocketCode = `// WebSocket integration for live updates
(function() {
  let ws = null;
  let reconnectInterval = null;
  
  function connectWebSocket() {
    const wsUrl = window.location.protocol === 'https:' 
      ? 'wss://' + window.location.host 
      : 'ws://localhost:3000';
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ Connected to live updates');
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'sales:update') {
          updateProgressBarLive(message.data);
          
          // Show notification for new purchases
          if (message.data.latestPurchase) {
            showPurchaseNotification(message.data.latestPurchase);
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected, attempting reconnect...');
      if (!reconnectInterval) {
        reconnectInterval = setInterval(connectWebSocket, 5000);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  function updateProgressBarLive(data) {
    // Update progress bar
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar && progressText) {
      progressBar.style.width = data.percentSold + '%';
      progressText.textContent = data.percentSold + '% SOLD';
      
      // Animate the change
      progressBar.style.transition = 'width 0.5s ease-out';
    }
    
    // Update stats
    if (document.getElementById('soldBatches')) {
      document.getElementById('soldBatches').textContent = data.totalBatchesSold.toLocaleString();
    }
    if (document.getElementById('remainingBatches')) {
      document.getElementById('remainingBatches').textContent = data.remainingBatches.toLocaleString();
    }
    if (document.getElementById('totalTokens')) {
      document.getElementById('totalTokens').textContent = data.totalTokensSold.toLocaleString();
    }
  }
  
  function showPurchaseNotification(purchase) {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = 'purchase-toast';
    toast.innerHTML = \`
      <div class="toast-content">
        🎉 New Purchase: <strong>\${purchase.batchCount} batches</strong> sold!
      </div>
    \`;
    
    // Add CSS if not already present
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.innerHTML = \`
        .purchase-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: var(--yellow, #FFD700);
          color: #000;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      \`;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
  
  // Connect on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connectWebSocket);
  } else {
    connectWebSocket();
  }
  
  // Expose for debugging
  window.rgbWebSocket = {
    connect: connectWebSocket,
    disconnect: () => ws && ws.close(),
    getStatus: () => ws ? ws.readyState : 'No connection'
  };
})();
`;

// Write the client integration
fs.writeFileSync(
  path.join(__dirname, '..', 'client', 'js', 'websocket-integration.js'),
  clientWebSocketCode
);

console.log('✅ Files created:');
console.log('   - mock-api-server-live.js (Enhanced server with WebSocket)');
console.log('   - client/js/websocket-integration.js (Client integration)');
console.log('\n📝 To enable live updates:');
console.log('1. Stop current mock server');
console.log('2. Run: node mock-api-server-live.js');
console.log('3. Add to index.html before </body>:');
console.log('   <script src="js/websocket-integration.js"></script>');
console.log('\n✨ The progress bar will now update in real-time when anyone makes a purchase!');