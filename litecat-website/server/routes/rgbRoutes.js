const express = require('express');
const router = express.Router();
const rgbPaymentController = require('../controllers/rgbPaymentController');
const rateLimiter = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validation');
const { body, param } = require('express-validator');

// Rate limiting for RGB endpoints
const rgbLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

const invoiceLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: 'Too many invoice creation attempts, please try again later.'
});

// Validation rules
const createInvoiceValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('rgbInvoice').notEmpty().withMessage('RGB invoice is required'),
  body('batchCount').optional().isInt({ min: 1, max: 10 }).withMessage('Batch count must be between 1 and 10')
];

const invoiceIdValidation = [
  param('invoiceId').isUUID().withMessage('Invalid invoice ID')
];

// Routes

/**
 * @route   POST /api/rgb/invoice
 * @desc    Create Lightning invoice for RGB token purchase
 * @access  Public
 */
router.post(
  '/invoice',
  invoiceLimiter,
  createInvoiceValidation,
  validateRequest,
  rgbPaymentController.createInvoice
);

/**
 * @route   GET /api/rgb/invoice/:invoiceId/status
 * @desc    Check payment status and consignment availability
 * @access  Public
 */
router.get(
  '/invoice/:invoiceId/status',
  rgbLimiter,
  invoiceIdValidation,
  validateRequest,
  rgbPaymentController.checkPaymentStatus
);

/**
 * @route   GET /api/rgb/download/:invoiceId
 * @desc    Download RGB consignment file
 * @access  Public
 */
router.get(
  '/download/:invoiceId',
  rgbLimiter,
  invoiceIdValidation,
  validateRequest,
  rgbPaymentController.downloadConsignment
);

/**
 * @route   GET /api/rgb/stats
 * @desc    Get current RGB sale statistics
 * @access  Public
 */
router.get(
  '/stats',
  rgbLimiter,
  rgbPaymentController.getStats
);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'rgb-payment',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;