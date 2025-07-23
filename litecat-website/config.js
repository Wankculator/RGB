// Skip dotenv if not available (for scripts)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, assume env vars are already set
}

const config = {
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3001,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:8000'
  },
  
  database: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY
  },
  
  bitcoin: {
    walletAddress: process.env.BTC_WALLET_ADDRESS || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    walletXpub: process.env.BTC_WALLET_XPUB
  },
  
  payments: {
    coinpayments: {
      publicKey: process.env.COINPAYMENTS_PUBLIC_KEY || 'not-configured',
      privateKey: process.env.COINPAYMENTS_PRIVATE_KEY || 'not-configured',
      merchantId: process.env.COINPAYMENTS_MERCHANT_ID || 'not-configured',
      ipnSecret: process.env.COINPAYMENTS_IPN_SECRET || 'not-configured'
    }
  },
  
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY || 'not-configured',
    from: process.env.EMAIL_FROM || 'noreply@lightcat.io',
    fromName: process.env.EMAIL_FROM_NAME || 'LIGHTCAT',
    supportEmail: 'support@lightcat.io'
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    adminApiKey: process.env.ADMIN_API_KEY || 'dev-admin-key',
    allowedOrigins: [
      'http://localhost:8000',
      'http://localhost:8080',
      'http://localhost:3001',
      'https://lightcat.io',
      'https://www.lightcat.io'
    ],
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: 100
  },
  
  tokenSale: {
    totalSupply: parseInt(process.env.TOTAL_SUPPLY) || 21000000,
    totalBatches: parseInt(process.env.TOTAL_BATCHES) || 27900,
    pricePerBatchBTC: parseFloat(process.env.PRICE_PER_BATCH_BTC) || 0.00002,
    tokensPerBatch: parseInt(process.env.TOKENS_PER_BATCH) || 700,
    maxBatchesPerWallet: parseInt(process.env.MAX_BATCHES_PER_WALLET) || 10,
    minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS) || 1
  },
  
  token: {
    satoshisPerBatch: 2000, // 0.00002 BTC in satoshis
    tokensPerBatch: 700,
    availableBatches: 27900
  },
  
  game: {
    tiers: {
      1: { maxBatches: 5, requirement: 0 },
      2: { maxBatches: 10, requirement: 100 },
      3: { maxBatches: 20, requirement: 200 }
    }
  },
  
  rgb: {
    nodeUrl: process.env.RGB_NODE_URL || 'http://localhost:8094',
    nodeApiKey: process.env.RGB_NODE_API_KEY || 'placeholder',
    network: process.env.RGB_NETWORK || 'testnet'
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || ''
  },
  
  analytics: {
    mixpanelToken: process.env.MIXPANEL_TOKEN || '',
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || ''
  },
  
  development: {
    logLevel: process.env.LOG_LEVEL || 'debug',
    enableMocks: process.env.ENABLE_MOCKS === 'true'
  },
  
  admin: {
    email: 'admin@lightcat.io'
  }
};

// Validate required config
const requiredConfig = [
  'database.url',
  'database.serviceKey',
  'bitcoin.walletAddress'
];

for (const path of requiredConfig) {
  const keys = path.split('.');
  let value = config;
  for (const key of keys) {
    value = value[key];
  }
  if (!value) {
    console.error(`Missing required configuration: ${path}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

module.exports = config;