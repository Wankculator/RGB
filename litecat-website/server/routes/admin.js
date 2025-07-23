const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateAdmin } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const supabaseService = require('../services/supabaseService');
const rgbService = require('../services/rgbService');
const emailService = require('../services/emailService');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate credentials
    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        email, 
        role: 'admin',
        timestamp: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Log admin access
    logger.info('Admin login successful', { email, ip: req.ip });

    res.json({
      success: true,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN
    });

  } catch (error) {
    logger.error('Admin login error', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get dashboard statistics
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const [
      salesStats,
      recentPurchases,
      gameStats,
      systemHealth
    ] = await Promise.all([
      supabaseService.getSalesStatistics(),
      supabaseService.getRecentPurchases(20),
      supabaseService.getGameStatistics(),
      getSystemHealth()
    ]);

    res.json({
      sales: {
        totalBatchesSold: salesStats.total_batches_sold,
        totalRevenueBTC: salesStats.total_revenue_btc,
        totalRevenueUSD: salesStats.total_revenue_usd,
        uniqueBuyers: salesStats.unique_buyers,
        remainingBatches: 28500 - salesStats.total_batches_sold,
        percentageSold: ((salesStats.total_batches_sold / 28500) * 100).toFixed(2)
      },
      recentPurchases: recentPurchases.map(p => ({
        id: p.id,
        walletAddress: p.wallet_address,
        batches: p.batch_count,
        amount: p.amount,
        status: p.status,
        timestamp: p.created_at
      })),
      game: {
        totalPlayers: gameStats.total_players,
        gamesPlayed: gameStats.games_played,
        averageScore: gameStats.average_score,
        tierDistribution: gameStats.tier_distribution,
        topScores: gameStats.top_scores
      },
      system: systemHealth
    });

  } catch (error) {
    logger.error('Dashboard data fetch error', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all purchases with filtering
router.get('/purchases', authenticateAdmin, async (req, res) => {
  try {
    const { 
      status, 
      limit = 50, 
      offset = 0,
      startDate,
      endDate,
      walletAddress
    } = req.query;

    const purchases = await supabaseService.getPurchases({
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate,
      endDate,
      walletAddress
    });

    res.json({
      purchases,
      total: purchases.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Purchases fetch error', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Manually trigger token distribution
router.post('/distribute-tokens/:purchaseId', authenticateAdmin, async (req, res) => {
  try {
    const { purchaseId } = req.params;
    
    const purchase = await supabaseService.getPurchaseById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    if (purchase.tokens_distributed) {
      return res.status(400).json({ error: 'Tokens already distributed' });
    }

    // Trigger RGB token distribution
    const result = await rgbService.distributeTokens({
      purchaseId: purchase.id,
      walletAddress: purchase.wallet_address,
      tokenAmount: purchase.batch_count * 700,
      transactionHash: purchase.bitcoin_txid
    });

    // Update purchase record
    await supabaseService.markTokensDistributed(purchaseId, result.rgbTxId);

    // Send notification email
    await emailService.sendTokensDistributed({
      email: purchase.email,
      walletAddress: purchase.wallet_address,
      tokenAmount: purchase.batch_count * 700,
      rgbTxId: result.rgbTxId
    });

    logger.info('Manual token distribution completed', { purchaseId, rgbTxId: result.rgbTxId });

    res.json({
      success: true,
      rgbTxId: result.rgbTxId,
      message: 'Tokens distributed successfully'
    });

  } catch (error) {
    logger.error('Token distribution error', error);
    res.status(500).json({ error: 'Failed to distribute tokens' });
  }
});

// Export data for analysis
router.get('/export/:type', authenticateAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json', startDate, endDate } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'purchases':
        data = await supabaseService.exportPurchases({ startDate, endDate });
        filename = `purchases_${Date.now()}.${format}`;
        break;
      
      case 'game-scores':
        data = await supabaseService.exportGameScores({ startDate, endDate });
        filename = `game_scores_${Date.now()}.${format}`;
        break;
      
      case 'wallets':
        data = await supabaseService.exportWalletAddresses();
        filename = `wallets_${Date.now()}.${format}`;
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(data);
    }

  } catch (error) {
    logger.error('Export error', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Update system settings
router.put('/settings', authenticateAdmin, async (req, res) => {
  try {
    const { 
      maintenanceMode,
      maxBatchesPerTier,
      gameEnabled,
      emailNotifications
    } = req.body;

    const updates = {};
    
    if (maintenanceMode !== undefined) {
      process.env.FEATURE_MAINTENANCE_MODE = maintenanceMode.toString();
      updates.maintenanceMode = maintenanceMode;
    }
    
    if (maxBatchesPerTier) {
      process.env.MAX_BATCHES_PER_TIER = maxBatchesPerTier.join(',');
      updates.maxBatchesPerTier = maxBatchesPerTier;
    }
    
    if (gameEnabled !== undefined) {
      process.env.FEATURE_GAME_ENABLED = gameEnabled.toString();
      updates.gameEnabled = gameEnabled;
    }
    
    if (emailNotifications !== undefined) {
      process.env.FEATURE_EMAIL_NOTIFICATIONS = emailNotifications.toString();
      updates.emailNotifications = emailNotifications;
    }

    logger.info('System settings updated', { updates, adminEmail: req.user.email });

    res.json({
      success: true,
      updates,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    logger.error('Settings update error', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Ban/unban wallet address
router.post('/wallets/:address/ban', authenticateAdmin, async (req, res) => {
  try {
    const { address } = req.params;
    const { reason, duration } = req.body;

    await supabaseService.banWallet({
      address,
      reason,
      duration,
      bannedBy: req.user.email,
      bannedAt: new Date().toISOString()
    });

    logger.info('Wallet banned', { address, reason, adminEmail: req.user.email });

    res.json({
      success: true,
      message: 'Wallet banned successfully'
    });

  } catch (error) {
    logger.error('Wallet ban error', error);
    res.status(500).json({ error: 'Failed to ban wallet' });
  }
});

// Helper functions
async function getSystemHealth() {
  return {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    services: {
      database: await supabaseService.checkHealth(),
      redis: 'not_configured', // Redis not currently used in this implementation
      rgb: await rgbService.checkHealth(),
      email: await emailService.checkHealth()
    }
  };
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

module.exports = router;