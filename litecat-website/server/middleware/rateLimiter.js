const rateLimit = require('express-rate-limit');

/**
 * Create a rate limiter with custom options
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: options.message || defaults.message,
        retryAfter: Math.ceil(options.windowMs / 1000) || Math.ceil(defaults.windowMs / 1000)
      });
    }
  };

  return rateLimit({
    ...defaults,
    ...options
  });
}

module.exports = createRateLimiter;