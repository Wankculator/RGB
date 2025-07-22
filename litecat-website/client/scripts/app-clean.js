// LIGHTCAT Token Website - Frontend Application
// Optimized for Hostinger Shared Hosting

// Configuration
window.BTC_WALLET = 'bc1qjzzlcqhfxd745qmfdtd2vs2eggz935s5hx32fm';
window.mockAPI = true;

// Mock API responses for static hosting
const mockData = {
    stats: {
        totalBatches: 28500,
        batchesSold: 1250,
        batchesRemaining: 27250,
        tokensSold: 875000,
        salesProgress: 4.38,
        uniqueBuyers: 342
    }
};

// Override fetch to use mock data
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    console.log('Fetch intercepted:', url);
    
    // Mock create invoice endpoint
    if (url.includes('/api/payments/create-invoice') || url.includes('create-invoice')) {
        const body = options && options.body ? JSON.parse(options.body) : {};
        const batchCount = body.batchCount || 1;
        const totalSats = batchCount * 2000;
        
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                invoiceId: 'RGB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                paymentAddress: window.BTC_WALLET,
                amount: totalSats,
                amountBTC: totalSats / 100000000,
                batchCount: batchCount,
                totalTokens: batchCount * 700,
                status: 'pending',
                qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=bitcoin:${window.BTC_WALLET}?amount=${totalSats/100000000}&label=LIGHTCAT%20Token%20Purchase`
            })
        });
    }
    
    // Mock stats endpoint
    if (url.includes('/api/payments/stats') || url.includes('/api/stats')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockData.stats)
        });
    }
    
    // Mock game score endpoint
    if (url.includes('/api/game/score')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
        });
    }
    
    // For any other requests, return a mock success
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
    });
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('LIGHTCAT Token Website Initialized');
    
    // Update stats on page load
    updateStats();
    
    // Update stats every 5 seconds
    setInterval(updateStats, 5000);
    
    // Initialize purchase form if it exists
    const purchaseForm = document.getElementById('purchaseForm');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', handlePurchaseSubmit);
    }
    
    // Initialize batch counter buttons
    const decreaseBtn = document.getElementById('decreaseBatch');
    const increaseBtn = document.getElementById('increaseBatch');
    
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', decreaseBatch);
    }
    
    if (increaseBtn) {
        increaseBtn.addEventListener('click', increaseBatch);
    }
    
    // Initialize modal close button
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('paymentModal').style.display = 'none';
        });
    }
});

// Update stats function
async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        // Update UI elements
        updateElement('soldBatches', stats.batchesSold?.toLocaleString());
        updateElement('remainingBatches', stats.batchesRemaining?.toLocaleString());
        updateElement('totalTokens', stats.tokensSold?.toLocaleString());
        updateElement('uniqueBuyers', stats.uniqueBuyers);
        updateElement('progressBar', null, { width: stats.salesProgress + '%' });
        updateElement('progressText', stats.salesProgress + '% SOLD');
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Handle purchase form submission
async function handlePurchaseSubmit(e) {
    e.preventDefault();
    
    const walletAddress = document.getElementById('walletAddress').value;
    const batchCount = parseInt(document.getElementById('batchCount').textContent);
    
    // Basic validation
    if (!walletAddress || walletAddress.length < 26) {
        alert('Please enter a valid Bitcoin wallet address');
        return;
    }
    
    try {
        // Create invoice
        const response = await fetch('/api/payments/create-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                walletAddress,
                batchCount,
                gameTier: getCurrentTier()
            })
        });
        
        const invoice = await response.json();
        
        // Show payment modal
        showPaymentModal(invoice);
        
    } catch (error) {
        console.error('Error creating invoice:', error);
        alert('Error creating invoice. Please try again.');
    }
}

// Show payment modal
function showPaymentModal(invoice) {
    const modal = document.getElementById('paymentModal');
    
    // Update modal content
    updateElement('paymentAmount', invoice.amountBTC.toFixed(8) + ' BTC');
    updateElement('paymentAddress', invoice.paymentAddress);
    
    // Show QR code
    const qrContainer = document.getElementById('qrCode');
    if (qrContainer) {
        qrContainer.innerHTML = `<img src="${invoice.qrCode}" alt="QR Code" style="width: 180px; height: 180px;">`;
    }
    
    // Show modal
    modal.style.display = 'flex';
}

// Batch management functions
function decreaseBatch() {
    const batchElement = document.getElementById('batchCount');
    let current = parseInt(batchElement.textContent);
    if (current > 1) {
        batchElement.textContent = current - 1;
        updatePrice();
    }
}

function increaseBatch() {
    const batchElement = document.getElementById('batchCount');
    const maxBatches = parseInt(document.getElementById('maxBatches').textContent);
    let current = parseInt(batchElement.textContent);
    if (current < maxBatches) {
        batchElement.textContent = current + 1;
        updatePrice();
    }
}

function updatePrice() {
    const batches = parseInt(document.getElementById('batchCount').textContent);
    const satsPerBatch = 2000;
    const totalSats = batches * satsPerBatch;
    const totalBTC = totalSats / 100000000;
    const totalTokens = batches * 700;
    
    updateElement('totalBTC', totalBTC.toFixed(8) + ' BTC');
    updateElement('totalSats', totalSats.toLocaleString());
    updateElement('tokenAmount', totalTokens.toLocaleString());
}

// Get current tier based on score
function getCurrentTier() {
    // Check if game has been played and tier unlocked
    const score = parseInt(localStorage.getItem('highScore') || '0');
    if (score >= 101) return 3;
    if (score >= 51) return 2;
    return 1;
}

// Utility function to update elements
function updateElement(id, text, style) {
    const element = document.getElementById(id);
    if (element) {
        if (text !== null && text !== undefined) {
            element.textContent = text;
        }
        if (style) {
            Object.assign(element.style, style);
        }
    }
}

// Copy functions for payment modal
window.copyAddress = function() {
    const address = document.getElementById('paymentAddress').textContent;
    navigator.clipboard.writeText(address).then(() => {
        alert('Address copied to clipboard');
    });
};

window.copyAmount = function() {
    const amount = document.getElementById('paymentAmount').textContent.replace(' BTC', '');
    navigator.clipboard.writeText(amount).then(() => {
        alert('Amount copied to clipboard');
    });
};

// Initialize mock data updates with slight variations
setInterval(() => {
    // Add slight random variations to make it look live
    const variation = Math.floor(Math.random() * 5);
    mockData.stats.batchesSold = 1250 + variation;
    mockData.stats.batchesRemaining = 28500 - mockData.stats.batchesSold;
    mockData.stats.tokensSold = mockData.stats.batchesSold * 700;
    mockData.stats.salesProgress = ((mockData.stats.batchesSold / 28500) * 100).toFixed(2);
    mockData.stats.uniqueBuyers = 342 + Math.floor(variation / 2);
}, 10000);

console.log('LIGHTCAT Token - Static Hosting Version Loaded');
console.log('Bitcoin Wallet:', window.BTC_WALLET);