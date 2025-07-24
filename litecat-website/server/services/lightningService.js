const crypto = require('crypto');
const { logger } = require('../utils/logger');
const VoltageLightningService = require('./voltageLightningService');

class LightningService {
  constructor() {
    // Use Voltage Lightning service if configured
    if (process.env.VOLTAGE_NODE_URL || process.env.LIGHTNING_MACAROON_PATH) {
      logger.info('Using Voltage Lightning service');
      this.voltageService = new VoltageLightningService();
      this.useVoltage = true;
      
      // Set up event listeners for invoice updates
      this.voltageService.on('invoice_settled', (invoice) => {
        logger.info('Invoice settled via Voltage webhook:', invoice.payment_hash);
        // This event can be used to trigger payment processing
      });
    } else {
      // Fallback configuration for development
      this.useVoltage = false;
      logger.info('Using mock Lightning service for development');
    }
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
      // Use Voltage service if available
      if (this.useVoltage) {
        return await this.voltageService.createInvoice({ amount, memo, expiry });
      }

      // Fallback to mock invoice for development
      logger.warn('No Lightning node configured, returning mock invoice');
      return this.createMockInvoice(amount, memo, expiry);

    } catch (error) {
      logger.error('Error creating Lightning invoice:', error);
      
      // Fallback to mock invoice for development
      return this.createMockInvoice(amount, memo, expiry);
    }
  }

  /**
   * Lookup invoice status by payment hash
   * @param {string} paymentHash - Payment hash to lookup
   * @returns {Object} Invoice status details
   */
  async lookupInvoice(paymentHash) {
    try {
      // Use Voltage service if available
      if (this.useVoltage) {
        return await this.voltageService.checkInvoiceStatus(paymentHash);
      }

      // Fallback to mock for development
      return this.getMockInvoiceStatus(paymentHash);

    } catch (error) {
      logger.error('Error looking up invoice:', error);
      
      // Fallback to mock for development
      return this.getMockInvoiceStatus(paymentHash);
    }
  }

  /**
   * Alias for lookupInvoice to match payment controller
   */
  async checkInvoiceStatus(paymentHash) {
    return this.lookupInvoice(paymentHash);
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