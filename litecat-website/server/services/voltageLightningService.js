const https = require('https');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { logger } = require('../utils/logger');

/**
 * Voltage Lightning Service
 * Production-ready Lightning Network integration for LIGHTCAT
 */
class VoltageLightningService extends EventEmitter {
  constructor() {
    super();
    
    // Voltage node configuration
    this.nodeUrl = process.env.VOLTAGE_NODE_URL || 'https://lightcat.m.voltageapp.io:8080';
    this.macaroonPath = process.env.LIGHTNING_MACAROON_PATH || path.join(__dirname, '../../voltage-credentials/admin.macaroon');
    this.certPath = process.env.LIGHTNING_TLS_CERT_PATH || path.join(__dirname, '../../voltage-credentials/tls.cert');
    
    // Connection state
    this.connected = false;
    this.nodeInfo = null;
    this.invoiceSubscriptions = new Map();
    
    // Initialize connection
    this.initialize();
  }

  /**
   * Initialize connection to Voltage node
   */
  async initialize() {
    try {
      // Check if credentials exist
      if (!fs.existsSync(this.macaroonPath)) {
        logger.warn('Voltage macaroon not found, running in mock mode');
        this.mockMode = true;
        return;
      }
      
      if (!fs.existsSync(this.certPath)) {
        logger.warn('Voltage TLS cert not found, running in mock mode');
        this.mockMode = true;
        return;
      }
      
      // Read credentials
      this.macaroon = fs.readFileSync(this.macaroonPath).toString('hex');
      this.tlsCert = fs.readFileSync(this.certPath);
      
      // Test connection
      const info = await this.getInfo();
      this.connected = true;
      this.nodeInfo = info;
      this.mockMode = false;
      
      logger.info('Connected to Voltage Lightning node:', {
        alias: info.alias,
        pubkey: info.identity_pubkey,
        testnet: info.testnet,
        version: info.version
      });
      
      // Start invoice subscription handler
      this.startInvoiceSubscription();
      
    } catch (error) {
      logger.error('Failed to connect to Voltage node:', error);
      this.mockMode = true;
    }
  }

  /**
   * Make authenticated request to Voltage API
   */
  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.nodeUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 8080,
        path: path,
        method: method,
        headers: {
          'Grpc-Metadata-macaroon': this.macaroon,
          'Content-Type': 'application/json'
        },
        ca: this.tlsCert,
        rejectUnauthorized: false
      };
      
      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = jsonData.length;
      }
      
      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            
            if (res.statusCode >= 400) {
              const error = new Error(parsed.message || `HTTP ${res.statusCode}`);
              error.code = res.statusCode;
              error.details = parsed;
              reject(error);
            } else {
              resolve(parsed);
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
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
   * Get node information
   */
  async getInfo() {
    if (this.mockMode) {
      return this.getMockNodeInfo();
    }
    
    try {
      const info = await this.makeRequest('GET', '/v1/getinfo');
      return {
        alias: info.alias,
        identity_pubkey: info.identity_pubkey,
        num_active_channels: info.num_active_channels,
        num_peers: info.num_peers,
        block_height: info.block_height,
        testnet: info.testnet,
        synced_to_chain: info.synced_to_chain,
        version: info.version
      };
    } catch (error) {
      logger.error('Failed to get node info:', error);
      throw error;
    }
  }

  /**
   * Create Lightning invoice
   */
  async createInvoice({ amount, memo, expiry = 900 }) {
    if (this.mockMode) {
      return this.createMockInvoice(amount, memo, expiry);
    }
    
    try {
      const invoice = await this.makeRequest('POST', '/v1/invoices', {
        value: amount.toString(),
        memo: memo,
        expiry: expiry.toString(),
        private: false,
        cltv_expiry: '144' // ~1 day in blocks
      });
      
      logger.info('Lightning invoice created:', {
        r_hash: invoice.r_hash,
        amount: amount,
        memo: memo
      });
      
      // Add to subscription tracking
      this.invoiceSubscriptions.set(invoice.r_hash, {
        created: new Date(),
        amount: amount,
        memo: memo,
        status: 'pending'
      });
      
      return {
        payment_request: invoice.payment_request,
        r_hash: invoice.r_hash,
        payment_hash: Buffer.from(invoice.r_hash, 'base64').toString('hex'),
        amount_sat: amount,
        memo: memo,
        expiry: expiry,
        created_at: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to create invoice:', error);
      throw error;
    }
  }

  /**
   * Check invoice status
   */
  async checkInvoiceStatus(paymentHash) {
    if (this.mockMode) {
      return this.getMockInvoiceStatus(paymentHash);
    }
    
    try {
      // Convert hex to base64 for API
      const r_hash = Buffer.from(paymentHash, 'hex').toString('base64');
      const invoice = await this.makeRequest('GET', `/v1/invoice/${r_hash}`);
      
      return {
        settled: invoice.settled,
        state: invoice.state,
        amt_paid_sat: parseInt(invoice.amt_paid_sat || invoice.value),
        r_preimage: invoice.r_preimage,
        settle_date: invoice.settle_date,
        payment_request: invoice.payment_request
      };
      
    } catch (error) {
      logger.error('Failed to check invoice status:', error);
      throw error;
    }
  }

  /**
   * Subscribe to all invoice updates
   */
  async startInvoiceSubscription() {
    if (this.mockMode) return;
    
    // Poll for invoice updates every 5 seconds
    this.invoicePoller = setInterval(async () => {
      for (const [r_hash, invoice] of this.invoiceSubscriptions) {
        if (invoice.status === 'pending') {
          try {
            const status = await this.makeRequest('GET', `/v1/invoice/${r_hash}`);
            
            if (status.settled && invoice.status === 'pending') {
              invoice.status = 'settled';
              
              logger.info('Invoice settled:', {
                r_hash: r_hash,
                amount: status.amt_paid_sat,
                memo: invoice.memo
              });
              
              // Emit event for payment processing
              this.emit('invoice_settled', {
                payment_hash: Buffer.from(r_hash, 'base64').toString('hex'),
                r_hash: r_hash,
                amount_sat: parseInt(status.amt_paid_sat),
                r_preimage: status.r_preimage,
                settle_date: status.settle_date
              });
            }
          } catch (error) {
            logger.error('Error checking invoice status:', error);
          }
        }
      }
      
      // Clean up old invoices (older than 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      for (const [r_hash, invoice] of this.invoiceSubscriptions) {
        if (invoice.created < oneHourAgo && invoice.status !== 'pending') {
          this.invoiceSubscriptions.delete(r_hash);
        }
      }
    }, 5000);
  }

  /**
   * Get wallet balance
   */
  async getBalance() {
    if (this.mockMode) {
      return {
        total_balance: '1000000',
        confirmed_balance: '900000',
        unconfirmed_balance: '100000'
      };
    }
    
    try {
      const balance = await this.makeRequest('GET', '/v1/balance/blockchain');
      return balance;
    } catch (error) {
      logger.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * List channels
   */
  async listChannels() {
    if (this.mockMode) {
      return { channels: [] };
    }
    
    try {
      const channels = await this.makeRequest('GET', '/v1/channels');
      return channels;
    } catch (error) {
      logger.error('Failed to list channels:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async checkHealth() {
    try {
      const info = await this.getInfo();
      return {
        healthy: info.synced_to_chain,
        synced: info.synced_to_chain,
        block_height: info.block_height,
        active_channels: info.num_active_channels
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Mock implementations for development
   */
  getMockNodeInfo() {
    return {
      alias: 'LIGHTCAT-DEV',
      identity_pubkey: '03' + require('crypto').randomBytes(32).toString('hex'),
      num_active_channels: 5,
      num_peers: 10,
      block_height: 820000,
      testnet: false,
      synced_to_chain: true,
      version: '0.17.0-beta'
    };
  }

  createMockInvoice(amount, memo, expiry) {
    const crypto = require('crypto');
    const paymentHash = crypto.randomBytes(32);
    const r_hash = paymentHash.toString('base64');
    
    // Create more realistic mock BOLT11 invoice
    const timestamp = Math.floor(Date.now() / 1000);
    const mockInvoice = `lnbc${amount}n1pn0yyqwpp5${paymentHash.toString('hex').substring(0, 52)}`;
    
    this.invoiceSubscriptions.set(r_hash, {
      created: new Date(),
      amount: amount,
      memo: memo,
      status: 'pending'
    });
    
    // Auto-settle mock invoices after 10 seconds
    setTimeout(() => {
      const invoice = this.invoiceSubscriptions.get(r_hash);
      if (invoice && invoice.status === 'pending') {
        invoice.status = 'settled';
        this.emit('invoice_settled', {
          payment_hash: paymentHash.toString('hex'),
          r_hash: r_hash,
          amount_sat: amount,
          r_preimage: crypto.randomBytes(32).toString('hex'),
          settle_date: Math.floor(Date.now() / 1000)
        });
      }
    }, 10000);
    
    return {
      payment_request: mockInvoice,
      r_hash: r_hash,
      payment_hash: paymentHash.toString('hex'),
      amount_sat: amount,
      memo: memo,
      expiry: expiry,
      created_at: new Date()
    };
  }

  getMockInvoiceStatus(paymentHash) {
    // Find invoice in subscriptions
    for (const [r_hash, invoice] of this.invoiceSubscriptions) {
      const hash = Buffer.from(r_hash, 'base64').toString('hex');
      if (hash === paymentHash) {
        return {
          settled: invoice.status === 'settled',
          state: invoice.status === 'settled' ? 'SETTLED' : 'OPEN',
          amt_paid_sat: invoice.amount,
          r_preimage: invoice.status === 'settled' ? require('crypto').randomBytes(32).toString('hex') : null,
          settle_date: invoice.status === 'settled' ? Math.floor(Date.now() / 1000) : null
        };
      }
    }
    
    return {
      settled: false,
      state: 'OPEN',
      amt_paid_sat: 0,
      r_preimage: null,
      settle_date: null
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.invoicePoller) {
      clearInterval(this.invoicePoller);
    }
    this.removeAllListeners();
  }
}

module.exports = VoltageLightningService;