const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../../config');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format for files
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} ${level}: ${message}`;
    if (Object.keys(metadata).length > 0 && metadata.stack) {
      msg += `\n${metadata.stack}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'litecat-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport with colorized output
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 30,
      tailable: true
    }),
    
    // Security log file
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 10485760, // 10MB
      maxFiles: 30,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10485760,
      maxFiles: 10
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10485760,
      maxFiles: 10
    })
  ]
});

// Enhanced logging methods
const loggerWrapper = {
  info: (message, metadata = {}) => {
    logger.info(message, sanitizeMetadata(metadata));
  },
  
  warn: (message, metadata = {}) => {
    logger.warn(message, sanitizeMetadata(metadata));
  },
  
  error: (message, error = null, metadata = {}) => {
    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    } : {};
    logger.error(message, { ...sanitizeMetadata(metadata), ...errorMeta });
  },
  
  debug: (message, metadata = {}) => {
    logger.debug(message, sanitizeMetadata(metadata));
  },
  
  security: (event, metadata = {}) => {
    logger.warn(`SECURITY: ${event}`, {
      ...sanitizeMetadata(metadata),
      securityEvent: true,
      timestamp: new Date().toISOString()
    });
  },
  
  metric: (name, value, metadata = {}) => {
    logger.info('METRIC', {
      metric: name,
      value,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString()
    });
  },
  
  audit: (action, userId, metadata = {}) => {
    logger.info('AUDIT', {
      action,
      userId,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString()
    });
  }
};

// Sanitize sensitive data from logs
function sanitizeMetadata(metadata) {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
  const sanitized = { ...metadata };
  
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };
  
  sanitizeObject(sanitized);
  return sanitized;
}

module.exports = { logger: loggerWrapper };
