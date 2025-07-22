const { logger } = require('../utils/logger');
const config = require('../../config');

class AppError extends Error {
  constructor(message, statusCode, code = 'GENERIC_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error('Error caught by middleware:', {
    message: err.message,
    statusCode: err.statusCode,
    code: err.code,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404, 'RESOURCE_NOT_FOUND');
  }

  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400, 'DUPLICATE_VALUE');
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token has expired';
    error = new AppError(message, 401, 'TOKEN_EXPIRED');
  }

  if (err.code === 'ECONNREFUSED') {
    const message = 'Service temporarily unavailable';
    error = new AppError(message, 503, 'SERVICE_UNAVAILABLE');
  }

  if (err.response && err.response.status === 429) {
    const message = 'Too many requests, please try again later';
    error = new AppError(message, 429, 'RATE_LIMIT_EXCEEDED');
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const code = error.code || 'INTERNAL_ERROR';

  const response = {
    error: {
      message,
      code,
      statusCode,
    },
  };

  if (config.server.env === 'development') {
    response.error.stack = err.stack;
    response.error.details = err;
  }

  if (statusCode >= 500) {
    logger.error('Critical error occurred:', {
      error: err,
      request: {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
      },
    });

    if (config.server.env === 'production') {
      // Send alert to monitoring service
      // await monitoringService.sendAlert({
      //   level: 'critical',
      //   message: `Critical error: ${message}`,
      //   error: err,
      //   request: req,
      // });
    }
  }

  res.status(statusCode).json(response);
};

const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const handleDatabaseError = (error) => {
  if (error.code === 'ECONNREFUSED') {
    return new AppError('Database connection failed', 503, 'DATABASE_CONNECTION_ERROR');
  }
  
  if (error.code === '23505') {
    return new AppError('Duplicate entry detected', 409, 'DUPLICATE_ENTRY');
  }
  
  if (error.code === '23503') {
    return new AppError('Referenced resource not found', 400, 'FOREIGN_KEY_VIOLATION');
  }
  
  if (error.code === '23502') {
    return new AppError('Required field missing', 400, 'NULL_CONSTRAINT_VIOLATION');
  }
  
  return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
};

const handleValidationError = (errors) => {
  const messages = errors.map(err => `${err.field}: ${err.message}`).join(', ');
  return new AppError(messages, 400, 'VALIDATION_ERROR');
};

const createError = (message, statusCode, code) => {
  return new AppError(message, statusCode, code);
};

module.exports = {
  AppError,
  errorHandler,
  notFound,
  asyncHandler,
  handleDatabaseError,
  handleValidationError,
  createError,
  
  // Predefined errors
  errors: {
    unauthorized: () => new AppError('Unauthorized access', 401, 'UNAUTHORIZED'),
    forbidden: () => new AppError('Access forbidden', 403, 'FORBIDDEN'),
    notFound: (resource = 'Resource') => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
    badRequest: (message = 'Bad request') => new AppError(message, 400, 'BAD_REQUEST'),
    conflict: (message = 'Conflict occurred') => new AppError(message, 409, 'CONFLICT'),
    tooManyRequests: () => new AppError('Too many requests', 429, 'TOO_MANY_REQUESTS'),
    internalError: () => new AppError('Internal server error', 500, 'INTERNAL_ERROR'),
    serviceUnavailable: () => new AppError('Service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE'),
  },
};