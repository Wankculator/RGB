const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const config = require('../config');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { logger } = require('./utils/logger');

// Import routes
const paymentRoutes = require('./routes/payments');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');
const rgbRoutes = require('./routes/rgbRoutes');

// Initialize Express app
const app = express();

// Security middleware
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://cdn.litecat.xyz"],
      scriptSrc: ["'self'", process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ""],
      connectSrc: ["'self'", config.database.url, "wss:", "https://api.coinpayments.net"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

// Remove null values for production
if (process.env.NODE_ENV === 'production') {
  Object.keys(helmetConfig.contentSecurityPolicy.directives).forEach(key => {
    helmetConfig.contentSecurityPolicy.directives[key] = 
      helmetConfig.contentSecurityPolicy.directives[key].filter(v => v !== "" && v !== null);
  });
}

app.use(helmet(helmetConfig));

// CORS configuration
app.use(cors({
  origin: config.security.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.server.env !== 'test') {
  app.use(morgan('combined', { 
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Health check endpoint
app.use('/health', healthRoutes);

// API routes
app.use('/api/payments', paymentRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/rgb', rgbRoutes);

// Serve client application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

const PORT = config.server.port;

// Create HTTP server
const http = require('http');
const server = http.createServer(app);

// Initialize WebSocket server
const WebSocketServer = require('./websocket');
const wsServer = new WebSocketServer(server);

// Export WebSocket server for use in other modules
app.wsServer = wsServer;

// Start server
server.listen(PORT, () => {
  logger.info(`🐱⚡ Litecat server running on port ${PORT} in ${config.server.env} mode`);
  logger.info(`🚀 Visit: http://localhost:${PORT}`);
  logger.info(`🔌 WebSocket server ready at ws://localhost:${PORT}/ws`);
});

module.exports = { app, wsServer };
