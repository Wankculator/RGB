// WebSocket integration for live updates
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
    toast.innerHTML = `
      <div class="toast-content">
        🎉 New Purchase: <strong>${purchase.batchCount} batches</strong> sold!
      </div>
    `;
    
    // Add CSS if not already present
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.innerHTML = `
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
      `;
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
