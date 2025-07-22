const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const config = require('../../config');

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'litecat-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const checks = await performHealthChecks();
    const overall = determineOverallHealth(checks);
    
    res.status(overall === 'healthy' ? 200 : 503).json({
      status: overall,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness probe for Kubernetes
router.get('/ready', async (req, res) => {
  try {
    // Check critical services
    const dbHealth = await supabaseService.checkHealth();
    
    if (dbHealth) {
      res.json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'Database not ready' });
    }
  } catch (error) {
    res.status(503).json({ ready: false, reason: error.message });
  }
});

// Liveness probe for Kubernetes
router.get('/live', (req, res) => {
  res.json({ alive: true });
});

// Metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await collectMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      system: {
        cpu: process.cpuUsage(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      application: metrics
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// Helper functions
async function performHealthChecks() {
  const checks = {
    database: { status: 'unknown' },
    redis: { status: 'unknown' },
    coinpayments: { status: 'unknown' },
    rgb: { status: 'unknown' },
    email: { status: 'unknown' }
  };

  // Check database
  try {
    const dbHealth = await supabaseService.checkHealth();
    checks.database = {
      status: dbHealth ? 'healthy' : 'unhealthy',
      responseTime: dbHealth?.responseTime || null
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  // Check Redis (when implemented)
  checks.redis = {
    status: 'not_implemented',
    message: 'Redis health check not yet implemented'
  };

  // Check CoinPayments API
  if (process.env.COINPAYMENTS_PUBLIC_KEY !== 'not-configured') {
    try {
      // Simple check - in production, would ping their API
      checks.coinpayments = {
        status: 'healthy',
        configured: true
      };
    } catch (error) {
      checks.coinpayments = {
        status: 'unhealthy',
        error: error.message
      };
    }
  } else {
    checks.coinpayments = {
      status: 'not_configured',
      message: 'CoinPayments API not configured'
    };
  }

  // Check RGB node
  checks.rgb = {
    status: 'mock_mode',
    message: 'RGB service running in mock mode for development'
  };

  // Check email service
  if (process.env.SENDGRID_API_KEY !== 'not-configured') {
    checks.email = {
      status: 'healthy',
      configured: true
    };
  } else {
    checks.email = {
      status: 'not_configured',
      message: 'Email service not configured'
    };
  }

  return checks;
}

function determineOverallHealth(checks) {
  const statuses = Object.values(checks).map(check => check.status);
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  
  // Allow not_configured and not_implemented for development
  if (process.env.NODE_ENV === 'development') {
    return 'healthy';
  }
  
  // In production, require all services to be healthy
  if (statuses.includes('not_configured') || statuses.includes('not_implemented')) {
    return 'degraded';
  }
  
  return 'healthy';
}

async function collectMetrics() {
  try {
    const [
      salesStats,
      gameStats,
      recentActivity
    ] = await Promise.all([
      supabaseService.getSalesStatistics(),
      supabaseService.getGameStatistics(),
      supabaseService.getRecentActivity(5)
    ]);

    return {
      sales: {
        totalBatches: salesStats?.total_batches_sold || 0,
        totalRevenue: salesStats?.total_revenue_btc || 0,
        uniqueBuyers: salesStats?.unique_buyers || 0
      },
      game: {
        totalPlayers: gameStats?.total_players || 0,
        gamesPlayed: gameStats?.games_played || 0,
        averageScore: gameStats?.average_score || 0
      },
      activity: {
        recentPurchases: recentActivity?.purchases || 0,
        recentGames: recentActivity?.games || 0
      }
    };
  } catch (error) {
    return {
      error: 'Failed to collect metrics',
      message: error.message
    };
  }
}

module.exports = router;