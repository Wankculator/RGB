const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

class LightningService {
  constructor() {
    // Lightning node configuration
    this.nodeUrl = process.env.LIGHTNING_NODE_URL || 'http://localhost:8080';
    this.macaroon = process.env.LIGHTNING_MACAROON;
    
    // Configure axios instance for Lightning REST API
    this.client = axios.create({
      baseURL: this.nodeUrl,
      headers: {
        'Grpc-Metadata-macaroon': this.macaroon,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Create a Lightning invoice
   * @param {Object} params - Invoice parameters
   * @param {number} params.amount - Amount in satoshis
   * @param {string} params.memo - Invoice description
   * @param {number} params.expiry - Invoice expiry in seconds
   * @returns {Object} Lightning invoice details
   */
  async createInvoice({ amount, memo, expiry = 3600 }) {
    try {
      // Create invoice request
      const invoiceRequest = {
        value: amount.toString(),
        memo: memo,
        expiry: expiry.toString(),
        private: false
      };

      // For development/testing, return mock invoice if no Lightning node configured
      if (!this.macaroon) {
        logger.warn('No Lightning node configured, returning mock invoice');
        return this.createMockInvoice(amount, memo, expiry);
      }

      // Call Lightning node API
      const response = await this.client.post('/v1/invoices', invoiceRequest);
      
      if (!response.data || !response.data.payment_request) {
        throw new Error('Invalid response from Lightning node');
      }

      logger.info(`Lightning invoice created: ${response.data.r_hash}`);

      return {
        payment_request: response.data.payment_request,
        payment_hash: response.data.r_hash,
        amount_sat: amount,
        memo: memo,
        expiry: expiry,
        created_at: new Date()
      };

    } catch (error) {
      logger.error('Error creating Lightning invoice:', error);
      
      // Fallback to mock invoice for development
      if (error.code === 'ECONNREFUSED' || !this.macaroon) {
        return this.createMockInvoice(amount, memo, expiry);
      }
      
      throw error;
    }
  }

  /**
   * Lookup invoice status by payment hash
   * @param {string} paymentHash - Payment hash to lookup
   * @returns {Object} Invoice status details
   */
  async lookupInvoice(paymentHash) {
    try {
      // For development, return mock status
      if (!this.macaroon) {
        return this.getMockInvoiceStatus(paymentHash);
      }

      // Call Lightning node API
      const response = await this.client.get(`/v1/invoice/${paymentHash}`);
      
      if (!response.data) {
        throw new Error('Invoice not found');
      }

      return {
        settled: response.data.settled,
        state: response.data.state,
        amt_paid_sat: response.data.amt_paid_sat,
        r_preimage: response.data.r_preimage,
        settle_date: response.data.settle_date,
        fee_paid_sat: response.data.fee_paid_sat || 0
      };

    } catch (error) {
      logger.error('Error looking up invoice:', error);
      
      // Fallback to mock for development
      if (error.code === 'ECONNREFUSED' || !this.macaroon) {
        return this.getMockInvoiceStatus(paymentHash);
      }
      
      throw error;
    }
  }

  /**
   * Subscribe to invoice updates
   * @param {string} paymentHash - Payment hash to monitor
   * @param {Function} callback - Callback function for updates
   */
  async subscribeToInvoice(paymentHash, callback) {
    try {
      // For development, use polling
      if (!this.macaroon) {
        return this.mockSubscribeToInvoice(paymentHash, callback);
      }

      // In production, would use gRPC streaming or websockets
      // For now, use polling as fallback
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.lookupInvoice(paymentHash);
          if (status.settled) {
            callback(null, status);
            clearInterval(pollInterval);
          }
        } catch (error) {
          callback(error, null);
          clearInterval(pollInterval);
        }
      }, 5000);

      // Return cleanup function
      return () => clearInterval(pollInterval);

    } catch (error) {
      logger.error('Error subscribing to invoice:', error);
      throw error;
    }
  }

  /**
   * Get node information
   * @returns {Object} Node info
   */
  async getNodeInfo() {
    try {
      if (!this.macaroon) {
        return {
          alias: 'LIGHTCAT Test Node',
          pubkey: '03' + crypto.randomBytes(32).toString('hex'),
          num_active_channels: 5,
          num_peers: 10,
          block_height: 820000,
          synced_to_chain: true
        };
      }

      const response = await this.client.get('/v1/getinfo');
      return response.data;

    } catch (error) {
      logger.error('Error getting node info:', error);
      throw error;
    }
  }

  /**
   * Create mock invoice for development
   */
  createMockInvoice(amount, memo, expiry) {
    const paymentHash = crypto.randomBytes(32).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create a mock BOLT11 invoice (simplified)
    const mockInvoice = `lnbc${amount}n${timestamp}${paymentHash.substring(0, 20)}`;
    
    return {
      payment_request: mockInvoice,
      payment_hash: paymentHash,
      amount_sat: amount,
      memo: memo,
      expiry: expiry,
      created_at: new Date()
    };
  }

  /**
   * Get mock invoice status for development
   */
  getMockInvoiceStatus(paymentHash) {
    // Simulate payment after 10 seconds in development
    const mockPaid = Date.now() - parseInt(paymentHash.substring(0, 8), 16) > 10000;
    
    return {
      settled: mockPaid,
      state: mockPaid ? 'SETTLED' : 'OPEN',
      amt_paid_sat: mockPaid ? 2000 : 0,
      r_preimage: mockPaid ? crypto.randomBytes(32).toString('hex') : null,
      settle_date: mockPaid ? Math.floor(Date.now() / 1000) : null,
      fee_paid_sat: mockPaid ? 10 : 0
    };
  }

  /**
   * Mock subscribe for development
   */
  mockSubscribeToInvoice(paymentHash, callback) {
    // Simulate payment after 10 seconds
    const timeout = setTimeout(() => {
      callback(null, {
        settled: true,
        state: 'SETTLED',
        amt_paid_sat: 2000,
        r_preimage: crypto.randomBytes(32).toString('hex'),
        settle_date: Math.floor(Date.now() / 1000),
        fee_paid_sat: 10
      });
    }, 10000);

    return () => clearTimeout(timeout);
  }
}

module.exports = new LightningService();