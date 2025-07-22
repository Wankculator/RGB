const crypto = require('crypto');
const axios = require('axios');
const config = require('../../config');
const { logger } = require('../utils/logger');

class CoinPaymentsService {
  constructor() {
    this.baseURL = 'https://www.coinpayments.net/api.php';
    this.publicKey = config.coinpayments.publicKey;
    this.privateKey = config.coinpayments.privateKey;
    this.merchantId = config.coinpayments.merchantId;
    this.ipnSecret = config.coinpayments.ipnSecret;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  generateHMAC(params) {
    const paramString = new URLSearchParams(params).toString();
    return crypto
      .createHmac('sha512', this.privateKey)
      .update(paramString)
      .digest('hex');
  }

  async makeRequest(cmd, params = {}) {
    const requestParams = {
      version: 1,
      cmd,
      key: this.publicKey,
      format: 'json',
      ...params,
    };

    const hmac = this.generateHMAC(requestParams);

    try {
      const response = await this.axiosInstance.post('', 
        new URLSearchParams(requestParams).toString(),
        {
          headers: {
            'HMAC': hmac,
          },
        }
      );

      if (response.data.error !== 'ok') {
        throw new Error(response.data.error);
      }

      return response.data.result;
    } catch (error) {
      logger.error('CoinPayments API error:', {
        cmd,
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  async createTransaction(options) {
    const {
      amount,
      walletAddress,
      batchCount,
      email,
      tier,
    } = options;

    try {
      const params = {
        amount: amount / 100000000,
        currency1: 'BTC',
        currency2: 'BTC',
        buyer_email: email || '',
        buyer_name: walletAddress.substring(0, 10) + '...',
        item_name: `Litecat Token - ${batchCount} batch${batchCount > 1 ? 'es' : ''} (${batchCount * 700} tokens)`,
        item_number: `LITECAT-${Date.now()}`,
        invoice: `${walletAddress}-${Date.now()}`,
        custom: JSON.stringify({
          wallet_address: walletAddress,
          batch_count: batchCount,
          tier,
          timestamp: Date.now(),
        }),
        ipn_url: `${config.server.baseUrl}/api/webhooks/coinpayments`,
        success_url: `${config.server.frontendUrl}/purchase/success`,
        cancel_url: `${config.server.frontendUrl}/purchase/cancel`,
      };

      const result = await this.makeRequest('create_transaction', params);

      return {
        transactionId: result.txn_id,
        paymentAddress: result.address,
        amount: result.amount,
        qrCodeUrl: result.qrcode_url,
        statusUrl: result.status_url,
        timeout: result.timeout,
        confirmsNeeded: result.confirms_needed || 3,
      };
    } catch (error) {
      logger.error('Failed to create CoinPayments transaction:', error);
      throw new Error('Failed to create payment invoice');
    }
  }

  async getTransactionInfo(transactionId) {
    try {
      const result = await this.makeRequest('get_tx_info', {
        txid: transactionId,
        full: 1,
      });

      return {
        status: this.mapStatus(result.status),
        statusText: result.status_text,
        amount: parseFloat(result.amount),
        amountReceived: parseFloat(result.receivedf || 0),
        confirmations: result.recv_confirms || 0,
        paymentAddress: result.payment_address,
        transactionHash: result.received_txid || null,
        timeCreated: result.time_created,
        timeExpires: result.time_expires,
        timeCompleted: result.time_completed || null,
      };
    } catch (error) {
      logger.error('Failed to get transaction info:', error);
      throw new Error('Failed to retrieve transaction information');
    }
  }

  async getTransactionList(options = {}) {
    const { limit = 100, start = 0, newer = null } = options;

    try {
      const params = {
        limit,
        start,
      };

      if (newer) {
        params.newer = newer;
      }

      const result = await this.makeRequest('get_tx_ids', params);

      return result;
    } catch (error) {
      logger.error('Failed to get transaction list:', error);
      throw new Error('Failed to retrieve transaction list');
    }
  }

  async createWithdrawal(options) {
    const { amount, address, currency = 'BTC', note = '' } = options;

    try {
      const params = {
        amount: amount / 100000000,
        currency,
        address,
        auto_confirm: 0,
        note,
      };

      const result = await this.makeRequest('create_withdrawal', params);

      return {
        withdrawalId: result.id,
        status: result.status,
        amount: result.amount,
      };
    } catch (error) {
      logger.error('Failed to create withdrawal:', error);
      throw new Error('Failed to create withdrawal');
    }
  }

  async getCallbackAddress(currency = 'BTC') {
    try {
      const result = await this.makeRequest('get_callback_address', {
        currency,
        ipn_url: `${config.server.baseUrl}/api/webhooks/coinpayments`,
      });

      return {
        address: result.address,
        pubkey: result.pubkey || null,
        destTag: result.dest_tag || null,
      };
    } catch (error) {
      logger.error('Failed to get callback address:', error);
      throw new Error('Failed to get callback address');
    }
  }

  verifyIPN(headers, body) {
    try {
      if (!headers['hmac'] || !this.ipnSecret) {
        logger.warn('Missing HMAC header or IPN secret');
        return false;
      }

      const hmac = crypto
        .createHmac('sha512', this.ipnSecret)
        .update(new URLSearchParams(body).toString())
        .digest('hex');

      const isValid = hmac === headers['hmac'];

      if (!isValid) {
        logger.warn('Invalid IPN HMAC signature');
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying IPN:', error);
      return false;
    }
  }

  parseIPNData(data) {
    try {
      const customData = data.custom ? JSON.parse(data.custom) : {};

      return {
        transactionId: data.txn_id,
        status: this.mapStatus(parseInt(data.status)),
        statusText: data.status_text,
        merchantId: data.merchant,
        email: data.email,
        amount: parseFloat(data.amount1),
        amountReceived: parseFloat(data.received_amount || 0),
        confirmations: parseInt(data.received_confirms || 0),
        currency: data.currency1,
        transactionHash: data.recv_txid || null,
        walletAddress: customData.wallet_address,
        batchCount: customData.batch_count,
        tier: customData.tier,
        fee: parseFloat(data.fee || 0),
        netAmount: parseFloat(data.net || data.amount1),
      };
    } catch (error) {
      logger.error('Error parsing IPN data:', error);
      throw new Error('Invalid IPN data format');
    }
  }

  mapStatus(statusCode) {
    const statusMap = {
      '-2': 'refunded',
      '-1': 'cancelled',
      '0': 'waiting',
      '1': 'confirming',
      '2': 'confirming',
      '3': 'confirming',
      '100': 'completed',
      '101': 'completed',
      '102': 'completed',
      '103': 'completed',
    };

    const mappedStatus = statusMap[statusCode.toString()] || 'unknown';

    if (mappedStatus === 'waiting' || mappedStatus === 'confirming') {
      return 'pending';
    }

    if (mappedStatus === 'cancelled' || statusCode < 0) {
      return 'failed';
    }

    return mappedStatus;
  }

  calculateTimeout(minutes = 60) {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  async validatePaymentAmount(received, expected, tolerance = 0.00000001) {
    const difference = Math.abs(received - expected);
    return difference <= tolerance;
  }

  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          logger.info(`Retrying after ${delay}ms (attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  async healthCheck() {
    try {
      const result = await this.makeRequest('get_basic_info');
      
      return {
        healthy: true,
        merchantId: result.merchant_id,
        username: result.username,
        email: result.email,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
}

module.exports = new CoinPaymentsService();