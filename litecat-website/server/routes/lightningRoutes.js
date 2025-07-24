const express = require('express');
const router = express.Router();
const lightningService = require('../services/lightningService');
const { logger } = require('../utils/logger');

/**
 * GET /api/lightning/info
 * Get Lightning node information
 */
router.get('/info', async (req, res) => {
  try {
    let nodeInfo;
    
    if (lightningService.useVoltage) {
      nodeInfo = await lightningService.voltageService.getInfo();
    } else {
      nodeInfo = {
        alias: 'LIGHTCAT-MOCK',
        identity_pubkey: 'mock_pubkey',
        num_active_channels: 0,
        synced_to_chain: true,
        testnet: false,
        block_height: 820000,
        version: 'mock-1.0.0'
      };
    }
    
    res.json({
      success: true,
      node: nodeInfo,
      connected: lightningService.useVoltage ? lightningService.voltageService.connected : false,
      mode: lightningService.useVoltage ? 'voltage' : 'mock'
    });
    
  } catch (error) {
    logger.error('Failed to get Lightning node info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get node information'
    });
  }
});

/**
 * GET /api/lightning/health
 * Check Lightning node health
 */
router.get('/health', async (req, res) => {
  try {
    let health;
    
    if (lightningService.useVoltage) {
      health = await lightningService.voltageService.checkHealth();
    } else {
      health = {
        healthy: true,
        synced: true,
        block_height: 820000,
        active_channels: 0
      };
    }
    
    res.json({
      success: true,
      health: health
    });
    
  } catch (error) {
    logger.error('Lightning health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      health: {
        healthy: false,
        error: error.message
      }
    });
  }
});

/**
 * GET /api/lightning/balance
 * Get wallet balance
 */
router.get('/balance', async (req, res) => {
  try {
    let balance;
    
    if (lightningService.useVoltage) {
      balance = await lightningService.voltageService.getBalance();
    } else {
      balance = {
        total_balance: '1000000',
        confirmed_balance: '900000',
        unconfirmed_balance: '100000'
      };
    }
    
    res.json({
      success: true,
      balance: balance
    });
    
  } catch (error) {
    logger.error('Failed to get balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance'
    });
  }
});

/**
 * POST /api/lightning/test-invoice
 * Create a test invoice (development only)
 */
router.post('/test-invoice', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test endpoint not available in production'
      });
    }
    
    const { amount = 1000, memo = 'LIGHTCAT test invoice' } = req.body;
    
    const invoice = await lightningService.createInvoice({
      amount: amount,
      memo: memo,
      expiry: 300 // 5 minutes for test
    });
    
    res.json({
      success: true,
      invoice: invoice
    });
    
  } catch (error) {
    logger.error('Failed to create test invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test invoice'
    });
  }
});

/**
 * GET /api/lightning/channels
 * List Lightning channels
 */
router.get('/channels', async (req, res) => {
  try {
    let channels;
    
    if (lightningService.useVoltage) {
      channels = await lightningService.voltageService.listChannels();
    } else {
      channels = {
        channels: []
      };
    }
    
    res.json({
      success: true,
      channels: channels
    });
    
  } catch (error) {
    logger.error('Failed to list channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list channels'
    });
  }
});

module.exports = router;