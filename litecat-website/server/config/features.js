// Feature Flags Configuration - Following CLAUDE.md
const { logger } = require('../utils/logger');

class FeatureFlags {
  constructor() {
    this.flags = {
      // RGB Integration
      useMockRGB: process.env.USE_MOCK_RGB === 'true',
      rgbFallbackToMock: process.env.RGB_FALLBACK_TO_MOCK === 'true',
      rgbNetwork: process.env.RGB_NETWORK || 'testnet',
      
      // Lightning Integration
      useMockLightning: process.env.USE_MOCK_LIGHTNING === 'true',
      lightningNetwork: process.env.LIGHTNING_NETWORK || 'testnet',
      
      // Payment Features
      enableBulkPurchases: process.env.ENABLE_BULK_PURCHASES === 'true',
      maxBatchesPerPurchase: parseInt(process.env.MAX_BATCHES_PER_PURCHASE || '10'),
      
      // Security Features
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
      enableWebhookValidation: process.env.ENABLE_WEBHOOK_VALIDATION !== 'false',
      
      // Development Features
      enableDebugLogging: process.env.ENABLE_DEBUG_LOGGING === 'true',
      enableTestEndpoints: process.env.ENABLE_TEST_ENDPOINTS === 'true',
      
      // Monitoring
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      enableErrorTracking: process.env.ENABLE_ERROR_TRACKING === 'true'
    };

    this.logConfiguration();
  }

  get(flagName) {
    return this.flags[flagName];
  }

  set(flagName, value) {
    const oldValue = this.flags[flagName];
    this.flags[flagName] = value;
    
    logger.info('Feature flag updated', {
      flag: flagName,
      oldValue,
      newValue: value
    });
  }

  isEnabled(flagName) {
    return this.flags[flagName] === true;
  }

  isDisabled(flagName) {
    return !this.isEnabled(flagName);
  }

  getAll() {
    return { ...this.flags };
  }

  logConfiguration() {
    logger.info('Feature Flags Configuration', {
      rgb: {
        useMock: this.flags.useMockRGB,
        network: this.flags.rgbNetwork,
        fallback: this.flags.rgbFallbackToMock
      },
      lightning: {
        useMock: this.flags.useMockLightning,
        network: this.flags.lightningNetwork
      },
      security: {
        rateLimiting: this.flags.enableRateLimiting,
        webhookValidation: this.flags.enableWebhookValidation
      },
      development: {
        debugLogging: this.flags.enableDebugLogging,
        testEndpoints: this.flags.enableTestEndpoints
      }
    });
  }

  // Check if we're in production mode
  isProduction() {
    return process.env.NODE_ENV === 'production' && 
           !this.flags.useMockRGB && 
           !this.flags.useMockLightning;
  }

  // Check if we're in test mode
  isTestMode() {
    return this.flags.useMockRGB || this.flags.useMockLightning;
  }

  // Get network configuration
  getNetworkConfig() {
    return {
      rgb: this.flags.rgbNetwork,
      lightning: this.flags.lightningNetwork,
      isMainnet: this.flags.rgbNetwork === 'mainnet' && 
                 this.flags.lightningNetwork === 'mainnet'
    };
  }

  // Validate configuration
  validateConfiguration() {
    const errors = [];

    // Check for dangerous production configurations
    if (process.env.NODE_ENV === 'production') {
      if (this.flags.enableTestEndpoints) {
        errors.push('Test endpoints should not be enabled in production');
      }
      
      if (this.flags.enableDebugLogging) {
        errors.push('Debug logging should not be enabled in production');
      }
      
      if (this.flags.useMockRGB && this.flags.rgbNetwork === 'mainnet') {
        errors.push('Mock RGB should not be used with mainnet configuration');
      }
    }

    // Check for mismatched networks
    if (this.flags.rgbNetwork !== this.flags.lightningNetwork) {
      errors.push(`Network mismatch: RGB on ${this.flags.rgbNetwork}, Lightning on ${this.flags.lightningNetwork}`);
    }

    if (errors.length > 0) {
      logger.error('Feature flag configuration errors:', errors);
      return { valid: false, errors };
    }

    return { valid: true };
  }
}

module.exports = new FeatureFlags();