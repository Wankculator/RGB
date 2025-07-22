// Simple client-side API for shared hosting deployment
// This replaces the Node.js backend for basic functionality

const API = {
    // Bitcoin wallet address
    BTC_WALLET: 'bc1qjzzlcqhfxd745qmfdtd2vs2eggz935s5hx32fm',
    
    // Mock sales data
    salesData: {
        totalBatches: 28500,
        batchesSold: 1250,
        uniqueBuyers: 342
    },
    
    // Create invoice (client-side only)
    createInvoice: function(walletAddress, batchCount, gameTier) {
        const invoiceId = 'LTC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const totalSats = batchCount * 2000;
        const totalBTC = totalSats / 100000000;
        
        // Store in localStorage for demo
        const invoice = {
            invoiceId: invoiceId,
            walletAddress: walletAddress,
            paymentAddress: this.BTC_WALLET,
            amount: totalSats,
            amountBTC: totalBTC,
            batchCount: batchCount,
            totalTokens: batchCount * 700,
            gameTier: gameTier,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('invoice_' + invoiceId, JSON.stringify(invoice));
        
        return invoice;
    },
    
    // Get sales stats
    getSalesStats: function() {
        // Simulate some random variation
        const variation = Math.floor(Math.random() * 10);
        const sold = this.salesData.batchesSold + variation;
        const remaining = this.salesData.totalBatches - sold;
        const progress = (sold / this.salesData.totalBatches * 100).toFixed(2);
        
        return {
            totalBatches: this.salesData.totalBatches,
            batchesSold: sold,
            batchesRemaining: remaining,
            tokensSold: sold * 700,
            salesProgress: progress,
            uniqueBuyers: this.salesData.uniqueBuyers + Math.floor(variation / 3)
        };
    },
    
    // Generate QR code for Bitcoin payment
    generateQR: async function(address, amount) {
        const bitcoinUri = `bitcoin:${address}?amount=${amount}&label=Litecat%20Token%20Purchase`;
        
        // Use QR code API service
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bitcoinUri)}`;
        
        return qrApiUrl;
    }
};

// Update the app.js fetch calls to use this API
window.SimpleAPI = API;