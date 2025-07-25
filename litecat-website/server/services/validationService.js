// Validation Service - Extracted from controllers to reduce file sizes
const bitcoinAddressValidation = require('bitcoin-address-validation');

class ValidationService {
  // RGB Invoice Validation
  validateRGBInvoice(rgbInvoice) {
    if (!rgbInvoice || typeof rgbInvoice !== 'string') {
      return { isValid: false, error: 'RGB invoice is required' };
    }

    // Check basic format - invoice must start with 'rgb:' and contain 'utxob:'
    if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {
      return { isValid: false, error: 'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"' };
    }

    // Additional validation rules
    if (rgbInvoice.length < 20) {
      return { isValid: false, error: 'RGB invoice too short' };
    }

    if (rgbInvoice.length > 500) {
      return { isValid: false, error: 'RGB invoice too long' };
    }

    return { isValid: true };
  }

  // Batch Count Validation
  validateBatchCount(batchCount, tier = null) {
    if (!batchCount || typeof batchCount !== 'number') {
      return { isValid: false, error: 'Batch count is required' };
    }

    if (batchCount < 1) {
      return { isValid: false, error: 'Minimum 1 batch required' };
    }

    // Tier-based limits
    const limits = {
      bronze: 5,
      silver: 8,
      gold: 10,
      default: 5
    };

    const maxBatches = tier ? limits[tier.toLowerCase()] : limits.default;
    
    if (batchCount > maxBatches) {
      return { 
        isValid: false, 
        error: `Maximum ${maxBatches} batches allowed${tier ? ' for ' + tier + ' tier' : ''}` 
      };
    }

    return { isValid: true };
  }

  // Bitcoin Address Validation
  validateBitcoinAddress(address) {
    if (!address || typeof address !== 'string') {
      return { isValid: false, error: 'Bitcoin address is required' };
    }

    try {
      const isValid = bitcoinAddressValidation.validate(address);
      if (!isValid) {
        return { isValid: false, error: 'Invalid Bitcoin address format' };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid Bitcoin address' };
    }
  }

  // Email Validation
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
  }

  // Lightning Invoice Validation
  validateLightningInvoice(invoice) {
    if (!invoice || typeof invoice !== 'string') {
      return { isValid: false, error: 'Lightning invoice is required' };
    }

    // Basic BOLT11 format check
    if (!invoice.match(/^ln(bc|tb|tbs|bcrt)\w+/i)) {
      return { isValid: false, error: 'Invalid Lightning invoice format' };
    }

    return { isValid: true };
  }

  // Amount Validation
  validateAmount(amount, currency = 'SATS') {
    if (amount === undefined || amount === null) {
      return { isValid: false, error: 'Amount is required' };
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, error: 'Invalid amount' };
    }

    // Minimum amounts by currency
    const minimums = {
      SATS: 1000,
      BTC: 0.00001
    };

    const minimum = minimums[currency] || minimums.SATS;
    if (numAmount < minimum) {
      return { 
        isValid: false, 
        error: `Minimum amount is ${minimum} ${currency}` 
      };
    }

    return { isValid: true };
  }

  // Game Score Validation
  validateGameScore(score, duration, tier) {
    const errors = [];

    if (typeof score !== 'number' || score < 0) {
      errors.push('Invalid score');
    }

    if (typeof duration !== 'number' || duration < 0 || duration > 60) {
      errors.push('Invalid game duration');
    }

    // Validate tier matches score
    if (tier) {
      const tierThresholds = {
        bronze: { min: 11, max: 17 },
        silver: { min: 18, max: 27 },
        gold: { min: 28, max: Infinity }
      };

      const threshold = tierThresholds[tier.toLowerCase()];
      if (threshold && (score < threshold.min || score > threshold.max)) {
        errors.push(`Score ${score} doesn't match ${tier} tier`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Transaction Hash Validation
  validateTransactionHash(hash) {
    if (!hash || typeof hash !== 'string') {
      return { isValid: false, error: 'Transaction hash is required' };
    }

    // Bitcoin transaction hash is 64 hex characters
    if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
      return { isValid: false, error: 'Invalid transaction hash format' };
    }

    return { isValid: true };
  }

  // Sanitize Input
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove any HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Escape special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Trim whitespace
    return sanitized.trim();
  }
}

module.exports = new ValidationService();