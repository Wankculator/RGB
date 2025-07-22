// LIGHTCAT Token Website - Professional Frontend Application
// Enhanced with animations and proper QR code generation

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
                status: 'pending'
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
    
    // Initialize counter animations
    animateCounters();
});

// Animate counters on load
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent.replace(/,/g, ''));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target.toLocaleString();
            }
        };
        
        // Start animation when element is in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        });
        
        observer.observe(counter);
    });
}

// Update stats function
async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        // Update UI elements with smooth transitions
        updateElementSmooth('soldBatches', stats.batchesSold);
        updateElementSmooth('remainingBatches', stats.batchesRemaining);
        updateElementSmooth('totalTokens', stats.tokensSold);
        updateElementSmooth('uniqueBuyers', stats.uniqueBuyers);
        
        // Update progress bar
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = stats.salesProgress + '%';
        }
        
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = stats.salesProgress + '% SOLD';
        }
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Smooth element update with animation
function updateElementSmooth(id, newValue) {
    const element = document.getElementById(id);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent.replace(/,/g, ''));
    const difference = newValue - currentValue;
    
    if (difference !== 0) {
        const duration = 1000;
        const steps = 30;
        const stepValue = difference / steps;
        const stepDuration = duration / steps;
        let step = 0;
        
        const interval = setInterval(() => {
            step++;
            const value = currentValue + (stepValue * step);
            element.textContent = Math.floor(value).toLocaleString();
            
            if (step >= steps) {
                clearInterval(interval);
                element.textContent = newValue.toLocaleString();
            }
        }, stepDuration);
    }
}

// Handle purchase form submission
async function handlePurchaseSubmit(e) {
    e.preventDefault();
    
    const walletAddress = document.getElementById('walletAddress').value;
    const batchCount = parseInt(document.getElementById('batchCount').textContent);
    
    // Basic validation
    if (!walletAddress || walletAddress.length < 26) {
        showNotification('Please enter a valid Bitcoin wallet address', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'CREATING INVOICE...';
        submitBtn.disabled = true;
        
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
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Show payment modal with the invoice data
        if (window.showPaymentModal) {
            window.showPaymentModal(invoice);
        } else {
            // Fallback for basic modal
            showPaymentModalBasic(invoice);
        }
        
    } catch (error) {
        console.error('Error creating invoice:', error);
        showNotification('Error creating invoice. Please try again.', 'error');
    }
}

// Basic payment modal (fallback)
function showPaymentModalBasic(invoice) {
    const modal = document.getElementById('paymentModal');
    
    // Update modal content
    const amountElement = document.getElementById('paymentAmount');
    const addressElement = document.getElementById('paymentAddress');
    
    if (amountElement) {
        amountElement.textContent = invoice.amountBTC.toFixed(8) + ' BTC';
    }
    
    if (addressElement) {
        addressElement.textContent = invoice.paymentAddress;
    }
    
    // Generate QR code if function exists
    if (window.generateQRCode) {
        window.generateQRCode(invoice.paymentAddress, invoice.amountBTC);
    }
    
    // Show modal
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Batch management functions
function decreaseBatch() {
    const batchElement = document.getElementById('batchCount');
    let current = parseInt(batchElement.textContent);
    if (current > 1) {
        batchElement.textContent = current - 1;
        updatePrice();
        animateBatchChange(batchElement);
    }
}

function increaseBatch() {
    const batchElement = document.getElementById('batchCount');
    const maxBatches = parseInt(document.getElementById('maxBatches').textContent);
    let current = parseInt(batchElement.textContent);
    if (current < maxBatches) {
        batchElement.textContent = current + 1;
        updatePrice();
        animateBatchChange(batchElement);
    }
}

// Animate batch count change
function animateBatchChange(element) {
    element.style.transform = 'scale(1.2)';
    element.style.transition = 'transform 0.2s ease';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 200);
}

function updatePrice() {
    const batches = parseInt(document.getElementById('batchCount').textContent);
    const satsPerBatch = 2000;
    const totalSats = batches * satsPerBatch;
    const totalBTC = totalSats / 100000000;
    const totalTokens = batches * 700;
    
    // Update with animation
    const btcElement = document.getElementById('totalBTC');
    const satsElement = document.getElementById('totalSats');
    const tokenElement = document.getElementById('tokenAmount');
    
    if (btcElement) {
        btcElement.style.opacity = '0.5';
        setTimeout(() => {
            btcElement.textContent = totalBTC.toFixed(8) + ' BTC';
            btcElement.style.opacity = '1';
        }, 150);
    }
    
    if (satsElement) {
        satsElement.textContent = totalSats.toLocaleString();
    }
    
    if (tokenElement) {
        tokenElement.textContent = totalTokens.toLocaleString();
    }
}

// Get current tier based on score
function getCurrentTier() {
    const score = parseInt(localStorage.getItem('highScore') || '0');
    if (score >= 101) return 3;
    if (score >= 51) return 2;
    return 1;
}

// Notification system
function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    const bgColor = type === 'error' ? '#FF3333' : 'var(--yellow)';
    
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: var(--black);
        padding: 15px 30px;
        border-radius: 50px;
        font-weight: 600;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Copy functions for payment modal
window.copyAddress = function() {
    const address = document.getElementById('paymentAddress').textContent;
    navigator.clipboard.writeText(address).then(() => {
        showNotification('Address copied to clipboard');
    }).catch(() => {
        showNotification('Failed to copy address', 'error');
    });
};

window.copyAmount = function() {
    const amount = document.getElementById('paymentAmount').textContent.replace(' BTC', '');
    navigator.clipboard.writeText(amount).then(() => {
        showNotification('Amount copied to clipboard');
    }).catch(() => {
        showNotification('Failed to copy amount', 'error');
    });
};

// Initialize mock data updates with slight variations
setInterval(() => {
    const variation = Math.floor(Math.random() * 5);
    mockData.stats.batchesSold = 1250 + variation;
    mockData.stats.batchesRemaining = 28500 - mockData.stats.batchesSold;
    mockData.stats.tokensSold = mockData.stats.batchesSold * 700;
    mockData.stats.salesProgress = ((mockData.stats.batchesSold / 28500) * 100).toFixed(2);
    mockData.stats.uniqueBuyers = 342 + Math.floor(variation / 2);
}, 10000);

// Update tier display based on game score
function updateTierDisplay() {
    const score = parseInt(localStorage.getItem('highScore') || '0');
    const tier1 = document.getElementById('tier1');
    const tier2 = document.getElementById('tier2');
    const tier3 = document.getElementById('tier3');
    const maxBatchesElement = document.getElementById('maxBatches');
    
    // Remove all unlocked classes
    [tier1, tier2, tier3].forEach(tier => {
        if (tier) tier.classList.remove('unlocked');
    });
    
    // Add unlocked class based on score
    if (score >= 0 && tier1) {
        tier1.classList.add('unlocked');
    }
    if (score >= 51 && tier2) {
        tier2.classList.add('unlocked');
    }
    if (score >= 101 && tier3) {
        tier3.classList.add('unlocked');
        if (maxBatchesElement) maxBatchesElement.textContent = '10';
    } else if (score >= 51) {
        if (maxBatchesElement) maxBatchesElement.textContent = '8';
    } else {
        if (maxBatchesElement) maxBatchesElement.textContent = '5';
    }
}

// Check tier on load
document.addEventListener('DOMContentLoaded', updateTierDisplay);

console.log('LIGHTCAT Token - Professional Version Loaded');
console.log('Bitcoin Wallet:', window.BTC_WALLET);