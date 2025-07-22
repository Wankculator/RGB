const { body, param, query, validationResult } = require('express-validator');
const bitcoinAddressValidation = require('bitcoin-address-validation');
const { logger } = require('../utils/logger');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', {
      path: req.path,
      errors: errors.array(),
      ip: req.ip,
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

const validators = {
  purchase: {
    create: [
      body('wallet_address')
        .trim()
        .notEmpty().withMessage('Wallet address is required')
        .custom((value) => {
          if (!bitcoinAddressValidation.validate(value)) {
            throw new Error('Invalid Bitcoin wallet address');
          }
          return true;
        })
        .customSanitizer(value => value.trim()),
      
      body('batch_count')
        .isInt({ min: 1, max: 10 }).withMessage('Batch count must be between 1 and 10')
        .toInt(),
      
      body('game_tier')
        .isInt({ min: 1, max: 3 }).withMessage('Game tier must be between 1 and 3')
        .toInt(),
      
      body('email')
        .optional()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
      
      handleValidationErrors,
    ],
    
    checkStatus: [
      param('id')
        .isUUID().withMessage('Invalid purchase ID format'),
      
      handleValidationErrors,
    ],
  },
  
  game: {
    submitScore: [
      body('score')
        .isInt({ min: 0, max: 1000 }).withMessage('Invalid score')
        .toInt(),
      
      body('session_id')
        .trim()
        .notEmpty().withMessage('Session ID is required')
        .isLength({ min: 16, max: 64 }).withMessage('Invalid session ID length'),
      
      body('game_data')
        .optional()
        .isObject().withMessage('Game data must be an object'),
      
      body('game_data.duration')
        .optional()
        .isInt({ min: 0, max: 3600000 }).withMessage('Invalid game duration'),
      
      body('game_data.actions')
        .optional()
        .isArray().withMessage('Actions must be an array'),
      
      handleValidationErrors,
    ],
    
    getLeaderboard: [
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),
      
      query('offset')
        .optional()
        .isInt({ min: 0 }).withMessage('Offset must be non-negative')
        .toInt(),
      
      query('period')
        .optional()
        .isIn(['all', 'daily', 'weekly', 'monthly']).withMessage('Invalid period'),
      
      handleValidationErrors,
    ],
  },
  
  admin: {
    login: [
      body('email')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
      
      body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
      
      body('two_factor_code')
        .optional()
        .isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
        .isNumeric().withMessage('2FA code must contain only numbers'),
      
      handleValidationErrors,
    ],
    
    updatePurchase: [
      param('id')
        .isUUID().withMessage('Invalid purchase ID'),
      
      body('status')
        .optional()
        .isIn(['pending', 'completed', 'failed', 'expired', 'refunded'])
        .withMessage('Invalid status'),
      
      body('transaction_hash')
        .optional()
        .matches(/^[a-fA-F0-9]{64}$/).withMessage('Invalid transaction hash'),
      
      body('refund_reason')
        .optional()
        .isLength({ max: 500 }).withMessage('Refund reason too long'),
      
      handleValidationErrors,
    ],
  },
  
  webhook: {
    coinpayments: [
      body('merchant')
        .notEmpty().withMessage('Merchant ID required'),
      
      body('txn_id')
        .notEmpty().withMessage('Transaction ID required'),
      
      body('status')
        .isInt().withMessage('Status must be a number'),
      
      body('status_text')
        .notEmpty().withMessage('Status text required'),
      
      handleValidationErrors,
    ],
  },
  
  common: {
    pagination: [
      query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
      
      query('per_page')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Per page must be between 1 and 100')
        .toInt(),
      
      query('sort_by')
        .optional()
        .matches(/^[a-zA-Z_]+$/).withMessage('Invalid sort field'),
      
      query('sort_order')
        .optional()
        .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
      
      handleValidationErrors,
    ],
    
    dateRange: [
      query('start_date')
        .optional()
        .isISO8601().withMessage('Invalid start date format')
        .toDate(),
      
      query('end_date')
        .optional()
        .isISO8601().withMessage('Invalid end date format')
        .toDate()
        .custom((value, { req }) => {
          if (req.query.start_date && value < req.query.start_date) {
            throw new Error('End date must be after start date');
          }
          return true;
        }),
      
      handleValidationErrors,
    ],
  },
};

const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/[<>]/g, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

module.exports = {
  validators,
  sanitizeInput,
  handleValidationErrors,
  validateRequest: handleValidationErrors
};