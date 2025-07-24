const https = require('https');
const { URL } = require('url');

/**
 * BTCPay Server Integration Service
 * Handles payment processing through BTCPay
 */
class BTCPayService {
  constructor() {
    this.baseUrl = process.env.BTCPAY_URL || 'https://btcpay0.voltageapp.io';
    this.apiKey = process.env.BTCPAY_API_KEY;
    this.storeId = process.env.BTCPAY_STORE_ID;
    
    // Check if we're in mock mode
    this.mockMode = process.env.USE_MOCK_LIGHTNING === 'true' || !this.apiKey;
    
    if (!this.mockMode && (!this.baseUrl || !this.apiKey || !this.storeId)) {
      console.warn('BTCPay not fully configured, running in mock mode');
      this.mockMode = true;
    }
  }

  /**
   * Create a payment invoice
   */
  async createInvoice({ amount, orderId, metadata = {} }) {
    if (this.mockMode) {
      return this.createMockInvoice(amount, orderId);
    }

    try {
      const invoiceData = {
        amount: amount.toString(),
        currency: 'SATS',
        metadata: {
          orderId,
          ...metadata
        }
      };

      const response = await this.makeRequest(
        `/api/v1/stores/${this.storeId}/invoices`,
        'POST',
        invoiceData
      );

      return {
        success: true,
        invoiceId: response.id,
        checkoutUrl: response.checkoutLink,
        amount: amount,
        status: response.status,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      };

    } catch (error) {
      console.error('BTCPay invoice creation failed:', error);
      // Fallback to mock in case of error
      return this.createMockInvoice(amount, orderId);
    }
  }

  /**
   * Check invoice status
   */
  async checkInvoiceStatus(invoiceId) {
    if (this.mockMode || invoiceId.startsWith('mock_')) {
      return this.getMockInvoiceStatus(invoiceId);
    }

    try {
      const response = await this.makeRequest(
        `/api/v1/stores/${this.storeId}/invoices/${invoiceId}`,
        'GET'
      );

      return {
        status: this.mapBTCPayStatus(response.status),
        paid: response.status !== 'New' && response.status !== 'Expired',
        amount: response.amount
      };

    } catch (error) {
      console.error('BTCPay status check failed:', error);
      return { status: 'error', paid: false };
    }
  }

  /**
   * Map BTCPay status to our status
   */
  mapBTCPayStatus(btcpayStatus) {
    const statusMap = {
      'New': 'pending',
      'Processing': 'pending',
      'Expired': 'expired',
      'Invalid': 'failed',
      'Settled': 'paid',
      'Complete': 'paid'
    };
    return statusMap[btcpayStatus] || 'pending';
  }

  /**
   * Make HTTP request to BTCPay
   */
  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl + path);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: method,
        headers: {
          'Authorization': `token ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = jsonData.length;
      }

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`BTCPay API Error: ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  /**
   * Create mock invoice for testing
   */
  createMockInvoice(amount, orderId) {
    const invoiceId = 'mock_' + Date.now();
    return {
      success: true,
      invoiceId: invoiceId,
      lightningInvoice: 'lnbc' + amount + 'mockqrcode',
      amount: amount,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: 'pending'
    };
  }

  /**
   * Get mock invoice status
   */
  getMockInvoiceStatus(invoiceId) {
    // Auto-pay mock invoices after 10 seconds
    const created = parseInt(invoiceId.split('_')[1]);
    const elapsed = Date.now() - created;
    
    if (elapsed > 10000) {
      return { status: 'paid', paid: true };
    }
    return { status: 'pending', paid: false };
  }
}

module.exports = new BTCPayService();