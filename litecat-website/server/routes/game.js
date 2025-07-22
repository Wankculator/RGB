const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const supabaseService = require('../services/supabaseService');
const crypto = require('crypto');

// Anti-cheat validation
const validateScore = (score, gameData) => {
  const { duration, actions, checkpoints } = gameData;
  
  // Basic sanity checks
  if (score < 0 || score > 10000) return false;
  if (duration < 5000) return false; // Game must last at least 5 seconds
  if (actions.length < score / 10) return false; // Must have reasonable actions
  
  // Validate checkpoints
  const expectedCheckpoints = Math.floor(score / 50);
  if (checkpoints.length < expectedCheckpoints * 0.8) return false;
  
  // Check for impossible scores based on duration
  const maxScorePerSecond = 10;
  const maxPossibleScore = (duration / 1000) * maxScorePerSecond;
  if (score > maxPossibleScore) return false;
  
  return true;
};

// Submit game score
router.post('/score', [
  body('score').isInt({ min: 0, max: 10000 }),
  body('sessionId').isString().isLength({ min: 32, max: 64 }),
  body('gameData').isObject(),
  body('gameData.duration').isInt({ min: 5000 }),
  body('gameData.actions').isArray(),
  body('gameData.checkpoints').isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { score, sessionId, gameData } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate score
    if (!validateScore(score, gameData)) {
      logger.warn('Suspicious score detected', { score, sessionId, ipAddress });
      return res.status(400).json({ error: 'Invalid score data' });
    }

    // Check for rate limiting per IP
    const recentScores = await supabaseService.getRecentScoresByIP(ipAddress, 60); // Last 60 minutes
    if (recentScores.length > 50) {
      return res.status(429).json({ error: 'Too many score submissions' });
    }

    // Calculate tier based on score
    let tier = 1;
    let maxBatches = 5;
    if (score >= 101) {
      tier = 3;
      maxBatches = 10;
    } else if (score >= 51) {
      tier = 2;
      maxBatches = 8;
    }

    // Store score in database
    const scoreRecord = await supabaseService.saveGameScore({
      session_id: sessionId,
      score,
      tier,
      max_batches: maxBatches,
      game_duration: gameData.duration,
      actions_count: gameData.actions.length,
      checkpoints: gameData.checkpoints.length,
      ip_address: ipAddress,
      user_agent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    // Update session with tier unlock
    await supabaseService.updateSessionTier(sessionId, tier, maxBatches);

    // Return tier information
    res.json({
      success: true,
      score,
      tier,
      maxBatches,
      tierName: ['Bronze', 'Silver', 'Gold'][tier - 1],
      scoreId: scoreRecord.id,
      message: `Congratulations! You've unlocked ${['Bronze', 'Silver', 'Gold'][tier - 1]} tier with ${maxBatches} max batches!`
    });

  } catch (error) {
    logger.error('Score submission error', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { period = 'daily', limit = 10 } = req.query;
    
    const leaderboard = await supabaseService.getLeaderboard({
      period,
      limit: Math.min(parseInt(limit) || 10, 100)
    });

    res.json({
      period,
      entries: leaderboard.map((entry, index) => ({
        rank: index + 1,
        score: entry.score,
        tier: entry.tier,
        tierName: ['Bronze', 'Silver', 'Gold'][entry.tier - 1],
        timestamp: entry.created_at
      }))
    });

  } catch (error) {
    logger.error('Leaderboard fetch error', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get player statistics
router.get('/stats/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const stats = await supabaseService.getPlayerStats(sessionId);
    
    if (!stats) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      highScore: stats.high_score,
      gamesPlayed: stats.games_played,
      currentTier: stats.current_tier,
      maxBatches: stats.max_batches,
      totalPlayTime: stats.total_play_time,
      averageScore: stats.average_score,
      lastPlayed: stats.last_played
    });

  } catch (error) {
    logger.error('Stats fetch error', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Validate session for purchase
router.post('/validate-session', [
  body('sessionId').isString().isLength({ min: 32, max: 64 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.body;
    
    const session = await supabaseService.getGameSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Invalid session' });
    }

    res.json({
      valid: true,
      tier: session.tier || 1,
      maxBatches: session.max_batches || 5,
      highScore: session.high_score || 0
    });

  } catch (error) {
    logger.error('Session validation error', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
});

// Report suspicious activity
router.post('/report', [
  body('sessionId').isString(),
  body('reason').isString().isIn(['cheating', 'bug', 'other']),
  body('details').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId, reason, details } = req.body;
    
    await supabaseService.reportSuspiciousActivity({
      session_id: sessionId,
      reason,
      details,
      reporter_ip: req.ip,
      timestamp: new Date().toISOString()
    });

    logger.info('Suspicious activity reported', { sessionId, reason });

    res.json({ success: true, message: 'Report submitted' });

  } catch (error) {
    logger.error('Report submission error', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;