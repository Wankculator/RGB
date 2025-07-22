const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');
const config = require('../../config');
const supabaseService = require('../services/supabaseService');

class AuthMiddleware {
  async authenticate(req, res, next) {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NO_TOKEN'
        });
      }

      const decoded = await this.verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }

      const user = await this.getUserFromToken(decoded);
      
      if (!user || !user.is_active) {
        return res.status(401).json({
          error: 'Account inactive or not found',
          code: 'INACTIVE_ACCOUNT'
        });
      }

      req.user = user;
      req.token = token;
      
      await this.updateLastActivity(user.id);
      
      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(500).json({
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  }

  async authenticateAdmin(req, res, next) {
    await this.authenticate(req, res, async () => {
      if (!req.user || req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      next();
    });
  }

  async authenticateOptional(req, res, next) {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        const decoded = await this.verifyToken(token);
        if (decoded) {
          const user = await this.getUserFromToken(decoded);
          if (user && user.is_active) {
            req.user = user;
            req.token = token;
          }
        }
      }
      
      next();
    } catch (error) {
      logger.warn('Optional auth failed, continuing as anonymous:', error.message);
      next();
    }
  }

  extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    if (req.cookies && req.cookies.auth_token) {
      return req.cookies.auth_token;
    }
    
    if (req.query && req.query.token) {
      return req.query.token;
    }
    
    return null;
  }

  async verifyToken(token) {
    try {
      return jwt.verify(token, config.security.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw error;
      }
      return null;
    }
  }

  async getUserFromToken(decoded) {
    const { data: user, error } = await supabaseService.client
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  }

  async updateLastActivity(userId) {
    try {
      await supabaseService.client
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      logger.warn('Failed to update last activity:', error);
    }
  }

  async generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };
    
    return jwt.sign(payload, config.security.jwtSecret, {
      expiresIn: config.security.jwtExpiresIn,
      issuer: 'litecat-api',
      audience: 'litecat-platform',
    });
  }

  async generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };
    
    return jwt.sign(payload, config.security.jwtRefreshSecret, {
      expiresIn: config.security.jwtRefreshExpiresIn,
    });
  }

  async hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  async revokeToken(token) {
    const decoded = await this.verifyToken(token);
    if (!decoded) return false;
    
    const expiresAt = new Date(decoded.exp * 1000);
    const ttl = Math.floor((expiresAt - Date.now()) / 1000);
    
    if (ttl > 0) {
      await supabaseService.cacheSet(
        `revoked_token:${token}`,
        true,
        ttl
      );
    }
    
    return true;
  }

  async isTokenRevoked(token) {
    const revoked = await supabaseService.cacheGet(`revoked_token:${token}`);
    return !!revoked;
  }
}

const authMiddleware = new AuthMiddleware();

module.exports = {
  authenticate: authMiddleware.authenticate.bind(authMiddleware),
  authenticateAdmin: authMiddleware.authenticateAdmin.bind(authMiddleware),
  authenticateOptional: authMiddleware.authenticateOptional.bind(authMiddleware),
  generateToken: authMiddleware.generateToken.bind(authMiddleware),
  generateRefreshToken: authMiddleware.generateRefreshToken.bind(authMiddleware),
  hashPassword: authMiddleware.hashPassword.bind(authMiddleware),
  verifyPassword: authMiddleware.verifyPassword.bind(authMiddleware),
  revokeToken: authMiddleware.revokeToken.bind(authMiddleware),
};