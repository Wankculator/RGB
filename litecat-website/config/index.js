module.exports = {
  // Database Configuration
  database: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_KEY,
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    corsOrigins: process.env.NODE_ENV === 'production' 
      ? ['https://litecat.xyz'] 
      : ['http://localhost:3000']
  },

  // Payment Configuration
  payments: {
    coinpayments: {
      publicKey: process.env.COINPAYMENTS_PUBLIC_KEY,
      privateKey: process.env.COINPAYMENTS_PRIVATE_KEY,
      merchantId: process.env.COINPAYMENTS_MERCHANT_ID,
      ipnSecret: process.env.COINPAYMENTS_IPN_SECRET,
      currency: 'BTC',
      timeout: 3600 // 1 hour
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Email Configuration
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    from: process.env.EMAIL_FROM || 'noreply@litecat.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@litecat.com'
  },

  // RGB Protocol Configuration
  rgb: {
    nodeHost: process.env.RGB_NODE_HOST || 'localhost',
    nodePort: parseInt(process.env.RGB_NODE_PORT) || 50001,
    network: process.env.RGB_NETWORK || 'bitcoin'
  },

  // Security Configuration
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? ['https://litecat.xyz']
      : ['http://localhost:3000', 'http://127.0.0.1:3000']
  },

  // Game Configuration
  game: {
    tiers: {
      1: { minScore: 0, maxScore: 9, maxBatches: 5 },
      2: { minScore: 10, maxScore: 19, maxBatches: 8 },
      3: { minScore: 20, maxScore: Infinity, maxBatches: 10 }
    }
  },

  // Token Economics
  token: {
    totalSupply: parseInt(process.env.TOTAL_SUPPLY) || 21000000,
    tokensPerBatch: parseInt(process.env.TOKENS_PER_BATCH) || 700,
    satoshisPerBatch: parseInt(process.env.TOKEN_PRICE_SATS) || 2000,
    totalBatches: parseInt(process.env.TOTAL_BATCHES) || 30000,
    devReserveBatches: parseInt(process.env.DEV_RESERVE_BATCHES) || 1500,
    availableBatches: parseInt(process.env.AVAILABLE_BATCHES) || 28500
  },

  // Webhook Configuration
  webhooks: {
    paymentSuccess: process.env.PAYMENT_SUCCESS_WEBHOOK,
    paymentFailed: process.env.PAYMENT_FAILED_WEBHOOK
  },

  // Client Configuration
  client: {
    url: process.env.SERVER_URL || 'http://localhost:3000',
    apiBaseUrl: process.env.SERVER_URL || 'http://localhost:3000'
  },

  // Bitcoin Configuration
  bitcoin: {
    walletAddress: process.env.BTC_WALLET_ADDRESS
  },

  // Admin Configuration
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  }
};
