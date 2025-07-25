// LIGHTCAT Token Constants - Single Source of Truth
module.exports = {
  // Token Supply
  TOTAL_TOKEN_SUPPLY: 21000000,
  TOKENS_PER_BATCH: 700,
  
  // Tokenomics Distribution
  PUBLIC_SALE_PERCENTAGE: 0.93,      // 93% for public sale
  TEAM_ALLOCATION_PERCENTAGE: 0.05,   // 5% for team (locked)
  PARTNER_ALLOCATION_PERCENTAGE: 0.02, // 2% for partners (locked)
  
  // Calculated Values
  PUBLIC_SALE_TOKENS: 19530000,      // 21M * 0.93 = 19,530,000
  TEAM_ALLOCATION_TOKENS: 1050000,   // 21M * 0.05 = 1,050,000
  PARTNER_ALLOCATION_TOKENS: 420000,  // 21M * 0.02 = 420,000
  
  // Critical: Total batches available for sale
  TOTAL_BATCHES_FOR_SALE: 27900,     // 19,530,000 ÷ 700 = 27,900
  
  // Pricing
  SATS_PER_BATCH: 2000,
  
  // Tier Limits - CRITICAL UPDATE: Mint is LOCKED without game play
  TIER_LIMITS: {
    bronze: 10,   // Bronze tier: 10 batches (7,000 tokens)
    silver: 20,   // Silver tier: 20 batches (14,000 tokens)
    gold: 30      // Gold tier: 30 batches (21,000 tokens)
  },
  
  // Warning Thresholds
  LOW_SUPPLY_WARNING: 1000,  // Warn admin when < 1000 batches remain
  CRITICAL_SUPPLY_WARNING: 100, // Critical alert when < 100 batches remain
  
  // Transaction Limits
  MIN_BATCH_PURCHASE: 1,
  MAX_BATCH_PURCHASE: 30,  // Updated to match gold tier max
  NO_TIER_MAX_BATCHES: 0,  // CRITICAL: 0 batches without tier - mint is LOCKED
  
  // Timing
  INVOICE_EXPIRY_MINUTES: 15,
  PAYMENT_POLL_INTERVAL_MS: 3000,
  
  // Network
  SUPPORTED_NETWORKS: ['mainnet', 'testnet']
};