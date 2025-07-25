// RGB Health Check Route
const express = require('express');
const router = express.Router();
const rgbAutomaticService = require('../services/rgbAutomaticService');

// RGB service health check
router.get('/health', async (req, res) => {
    try {
        const health = await rgbAutomaticService.healthCheck();
        const status = health.initialized ? 'healthy' : 'degraded';
        
        res.json({
            status,
            service: 'rgb-automatic',
            timestamp: new Date().toISOString(),
            details: health
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            service: 'rgb-automatic',
            error: error.message
        });
    }
});

// Get RGB balance
router.get('/balance', async (req, res) => {
    try {
        const balance = await rgbAutomaticService.getBalance();
        res.json({
            success: true,
            balance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get recent transfers
router.get('/transfers', async (req, res) => {
    try {
        const transfers = await rgbAutomaticService.getRecentTransfers();
        res.json({
            success: true,
            transfers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;