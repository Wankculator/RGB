const crypto = require('crypto');
const config = require('../../config');
const { logger } = require('../utils/logger');

class RGBService {
  constructor() {
    this.assetId = config.rgb.assetId || 'mock-litecat-asset-id';
    this.nodeUrl = config.rgb.nodeUrl;
    this.nodeApiKey = config.rgb.apiKey;
    this.mockMode = process.env.NODE_ENV === 'development' || process.env.RGB_MOCK_MODE === 'true';
    
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    };

    if (this.mockMode) {
      logger.info('RGB Service running in MOCK mode for development');
      this.mockData = {
        transfers: new Map(),
        balances: new Map(),
        distributions: []
      };
    }
  }

  async connect() {
    try {
      logger.info('Connecting to RGB node...');
      
      const health = await this.healthCheck();
      if (!health.healthy) {
        throw new Error('RGB node is not healthy');
      }
      
      logger.info('Successfully connected to RGB node', {
        version: health.version,
        network: health.network,
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to connect to RGB node:', error);
      throw error;
    }
  }

  async issueAsset(options) {
    const {
      name = 'Litecat Token',
      ticker = 'LITECAT',
      description = 'The first cat meme token on RGB Protocol',
      totalSupply = 21000000,
      precision = 0,
      issuedSupply = 1050000,
    } = options;

    try {
      const assetData = {
        name,
        ticker,
        description,
        precision,
        issued_supply: issuedSupply,
        total_supply: totalSupply,
        issue_structure: {
          declarative: {
            max_supply: totalSupply,
          },
        },
        metadata: {
          website: 'https://litecat.xyz',
          whitepaper: 'https://litecat.xyz/whitepaper.pdf',
          social: {
            twitter: '@RGBLightCat',
            telegram: 't.me/litecattoken',
          },
        },
      };

      const response = await this.makeRequest('/assets/issue', 'POST', assetData);
      
      logger.info('Asset issued successfully:', {
        assetId: response.asset_id,
        contractId: response.contract_id,
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to issue RGB asset:', error);
      throw error;
    }
  }

  async createTransfer(options) {
    const {
      invoice,
      amount,
      assetId = this.assetId,
    } = options;

    try {
      const transferId = crypto.randomBytes(16).toString('hex');
      
      if (this.mockMode) {
        // Mock implementation for development
        const mockTransferId = `mock-transfer-${transferId}`;
        
        // Create mock consignment data
        const mockConsignment = Buffer.concat([
          Buffer.from('RGB_CONSIGNMENT_V1'),
          crypto.randomBytes(32), // Contract ID
          Buffer.from([0x01]), // Version
          crypto.randomBytes(64), // Transfer data
          Buffer.from(invoice),
          Buffer.alloc(8),
          Buffer.from(amount.toString())
        ]);

        // Create mock PSBT
        const mockPsbt = Buffer.from('cHNidP8BAHECAAAAAeJQR2wrAAAAAA==', 'base64').toString('base64');
        
        // Store mock transfer
        this.mockData.transfers.set(mockTransferId, {
          transferId: mockTransferId,
          invoice,
          amount,
          assetId,
          status: 'pending',
          timestamp: new Date().toISOString()
        });
        
        logger.info('[MOCK] RGB transfer created:', {
          transferId: mockTransferId,
          invoice,
          amount
        });
        
        return {
          transferId: mockTransferId,
          consignment: mockConsignment,
          psbt: mockPsbt,
          disclosure: `RGB Transfer ${mockTransferId}\nAmount: ${amount}\nInvoice: ${invoice}`,
          assetId,
          amount,
          invoice,
          created_at: new Date()
        };
      }
      
      const transferData = {
        asset_id: assetId,
        amount,
        recipient_invoice: invoice,
        fee_rate: 5,
      };

      const response = await this.retryWithBackoff(async () => {
        return await this.makeRequest('/transfers/create', 'POST', transferData);
      });
      
      logger.info('RGB transfer created:', {
        transferId: response.transfer_id,
        consignment: response.consignment ? response.consignment.substring(0, 50) + '...' : 'N/A',
      });
      
      return {
        transferId: response.transfer_id,
        consignment: Buffer.from(response.consignment, 'hex'),
        psbt: response.psbt,
        disclosure: response.disclosure,
        assetId,
        amount,
        invoice,
        created_at: new Date()
      };
    } catch (error) {
      logger.error('Failed to create RGB transfer:', error);
      throw error;
    }
  }

  async getConsignment(transferId) {
    try {
      // For mock transfers
      if (transferId.startsWith('mock-transfer-')) {
        const transfer = this.mockData.transfers.get(transferId);
        if (!transfer) {
          throw new Error('Transfer not found');
        }
        
        // Generate deterministic mock consignment based on transfer ID
        const hash = crypto.createHash('sha256').update(transferId).digest();
        
        return Buffer.concat([
          Buffer.from('RGB_CONSIGNMENT_V1'),
          hash,
          Buffer.from([0x01]),
          crypto.randomBytes(128),
          Buffer.from(transferId)
        ]);
      }

      const response = await this.makeRequest(`/transfers/${transferId}/consignment`, 'GET');
      return Buffer.from(response.consignment, 'hex');

    } catch (error) {
      logger.error('Error getting consignment:', error);
      throw error;
    }
  }

  validateRGBInvoice(invoice) {
    try {
      // Basic format validation
      if (!invoice || typeof invoice !== 'string') {
        return false;
      }

      // Check for RGB invoice formats
      // Format 1: rgb:<base64>
      if (invoice.startsWith('rgb:')) {
        const base64Part = invoice.substring(4);
        return /^[A-Za-z0-9+/]+=*$/.test(base64Part);
      }

      // Format 2: rgb:utxob:<blinded_utxo>
      if (invoice.includes('utxob:')) {
        return true;
      }

      // Format 3: RGB20 invoice format
      if (invoice.startsWith('rgb20:')) {
        return true;
      }

      return false;

    } catch (error) {
      logger.error('Error validating RGB invoice:', error);
      return false;
    }
  }

  async finalizeTransfer(transferId, signedPsbt) {
    try {
      const response = await this.makeRequest(`/transfers/${transferId}/finalize`, 'POST', {
        signed_psbt: signedPsbt,
      });
      
      logger.info('RGB transfer finalized:', {
        transferId,
        txid: response.txid,
      });
      
      return {
        transferId,
        txid: response.txid,
        status: 'completed',
      };
    } catch (error) {
      logger.error('Failed to finalize RGB transfer:', error);
      throw error;
    }
  }

  async verifyConsignment(consignment) {
    try {
      const response = await this.makeRequest('/consignments/verify', 'POST', {
        consignment,
      });
      
      return {
        valid: response.valid,
        assetId: response.asset_id,
        amount: response.amount,
        sender: response.sender,
        recipient: response.recipient,
      };
    } catch (error) {
      logger.error('Failed to verify consignment:', error);
      throw error;
    }
  }

  async getBalance(walletAddress) {
    try {
      const response = await this.makeRequest(`/wallets/${walletAddress}/balance`, 'GET');
      
      const litecatBalance = response.assets.find(asset => asset.asset_id === this.assetId);
      
      return {
        address: walletAddress,
        balance: litecatBalance ? litecatBalance.balance : 0,
        assets: response.assets,
      };
    } catch (error) {
      logger.error('Failed to get RGB balance:', error);
      throw error;
    }
  }

  async getAssetInfo() {
    try {
      const response = await this.makeRequest(`/assets/${this.assetId}`, 'GET');
      
      return {
        assetId: response.asset_id,
        name: response.name,
        ticker: response.ticker,
        precision: response.precision,
        totalSupply: response.total_supply,
        issuedSupply: response.issued_supply,
        circulatingSupply: response.circulating_supply,
        metadata: response.metadata,
      };
    } catch (error) {
      logger.error('Failed to get asset info:', error);
      throw error;
    }
  }

  async getTransferHistory(walletAddress, options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    try {
      const response = await this.makeRequest(`/wallets/${walletAddress}/transfers`, 'GET', null, {
        asset_id: this.assetId,
        limit,
        offset,
      });
      
      return {
        transfers: response.transfers.map(tx => ({
          transferId: tx.transfer_id,
          direction: tx.direction,
          amount: tx.amount,
          counterparty: tx.counterparty,
          bitcoinTxid: tx.bitcoin_txid,
          status: tx.status,
          timestamp: tx.timestamp,
        })),
        total: response.total,
        hasMore: response.has_more,
      };
    } catch (error) {
      logger.error('Failed to get transfer history:', error);
      throw error;
    }
  }

  async batchTransfer(transfers) {
    try {
      const batchData = {
        transfers: transfers.map(transfer => ({
          recipient: transfer.walletAddress,
          amount: transfer.amount,
          memo: `Litecat Token Distribution - ${transfer.batchCount} batches`,
        })),
        asset_id: this.assetId,
        fee_rate: 5,
      };

      const response = await this.makeRequest('/transfers/batch', 'POST', batchData);
      
      logger.info('Batch transfer created:', {
        batchId: response.batch_id,
        transferCount: response.transfers.length,
      });
      
      return {
        batchId: response.batch_id,
        transfers: response.transfers,
        psbt: response.psbt,
        totalAmount: response.total_amount,
        totalFee: response.total_fee,
      };
    } catch (error) {
      logger.error('Failed to create batch transfer:', error);
      throw error;
    }
  }

  async generateBlindingKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  async makeRequest(endpoint, method = 'GET', data = null, params = null) {
    const url = new URL(`${this.nodeUrl}${endpoint}`);
    
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.nodeApiKey,
        'User-Agent': 'Litecat-RGB-Service/1.0',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`RGB API error: ${response.status} - ${error}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('RGB API request failed:', {
        endpoint,
        method,
        error: error.message,
      });
      throw error;
    }
  }

  async retryWithBackoff(fn) {
    let lastError;
    let delay = this.retryConfig.initialDelay;
    
    for (let i = 0; i < this.retryConfig.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i < this.retryConfig.maxRetries - 1) {
          logger.info(`Retrying RGB operation after ${delay}ms (attempt ${i + 1}/${this.retryConfig.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, this.retryConfig.maxDelay);
        }
      }
    }
    
    throw lastError;
  }

  async healthCheck() {
    try {
      if (this.mockMode) {
        return {
          healthy: true,
          version: '0.10.0-mock',
          network: 'regtest',
          syncProgress: 100,
          connectedPeers: 5,
          mode: 'mock'
        };
      }
      
      const response = await this.makeRequest('/health', 'GET');
      
      return {
        healthy: response.status === 'healthy',
        version: response.version,
        network: response.network,
        syncProgress: response.sync_progress,
        connectedPeers: response.connected_peers,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  async checkHealth() {
    const health = await this.healthCheck();
    return health.healthy;
  }

  async queueTokenDistribution(data) {
    if (this.mockMode) {
      this.mockData.distributions.push({
        ...data,
        status: 'queued',
        queuedAt: new Date().toISOString()
      });
      logger.info('[MOCK] Token distribution queued:', data);
      return { success: true, queueId: `mock-queue-${Date.now()}` };
    }
    
    // Real implementation would queue the distribution
    return { success: true, queueId: crypto.randomBytes(16).toString('hex') };
  }

  async distributeTokens(data) {
    const { purchaseId, walletAddress, tokenAmount, transactionHash } = data;
    
    if (this.mockMode) {
      const result = await this.transfer({
        walletAddress,
        amount: tokenAmount,
        bitcoinTxid: transactionHash,
        memo: `Litecat Token Distribution - Purchase ${purchaseId}`
      });
      
      return {
        ...result,
        rgbTxId: result.transferId,
        purchaseId
      };
    }
    
    // Real implementation
    return await this.transfer({
      walletAddress,
      amount: tokenAmount,
      bitcoinTxid: transactionHash,
      memo: `Litecat Token Distribution - Purchase ${purchaseId}`
    });
  }

  async estimateTransferFee(amount, recipientCount = 1) {
    try {
      const response = await this.makeRequest('/fees/estimate', 'POST', {
        asset_id: this.assetId,
        amount,
        recipient_count: recipientCount,
      });
      
      return {
        bitcoinFee: response.bitcoin_fee,
        rgbFee: response.rgb_fee,
        totalFee: response.total_fee,
        feeRate: response.fee_rate,
      };
    } catch (error) {
      logger.error('Failed to estimate transfer fee:', error);
      throw error;
    }
  }

  validateWalletAddress(address) {
    const rgbAddressRegex = /^rgb:[a-zA-Z0-9]{64}$/;
    const bitcoinAddressRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
    
    return rgbAddressRegex.test(address) || bitcoinAddressRegex.test(address);
  }

  async exportDistributionReport(startDate, endDate) {
    try {
      const response = await this.makeRequest('/reports/distributions', 'GET', null, {
        asset_id: this.assetId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        format: 'csv',
      });
      
      return {
        reportId: response.report_id,
        downloadUrl: response.download_url,
        expiresAt: response.expires_at,
        totalTransfers: response.summary.total_transfers,
        totalAmount: response.summary.total_amount,
        uniqueRecipients: response.summary.unique_recipients,
      };
    } catch (error) {
      logger.error('Failed to export distribution report:', error);
      throw error;
    }
  }

  async generateConsignment(options) {
    const { rgbInvoice, amount, invoiceId } = options;
    
    try {
      logger.info('Generating RGB consignment:', {
        invoiceId,
        amount,
        rgbInvoice: rgbInvoice.substring(0, 20) + '...'
      });

      // Create the transfer
      const transfer = await this.createTransfer({
        invoice: rgbInvoice,
        amount: amount
      });

      if (!transfer.consignment) {
        throw new Error('No consignment returned from transfer creation');
      }

      // Convert Buffer to base64 string for storage
      const consignmentBase64 = Buffer.isBuffer(transfer.consignment) 
        ? transfer.consignment.toString('base64')
        : Buffer.from(transfer.consignment).toString('base64');

      logger.info('Consignment generated successfully:', {
        invoiceId,
        transferId: transfer.transferId,
        consignmentSize: consignmentBase64.length
      });

      return consignmentBase64;
    } catch (error) {
      logger.error('Failed to generate consignment:', error);
      throw error;
    }
  }
}

module.exports = new RGBService();