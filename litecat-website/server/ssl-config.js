const fs = require('fs');
const path = require('path');
const { logger } = require('./utils/logger');

class SSLConfig {
  constructor() {
    this.options = null;
    this.enabled = false;
  }

  loadCertificates() {
    // Check if running in production
    if (process.env.NODE_ENV !== 'production') {
      logger.info('SSL disabled in development mode');
      return null;
    }

    try {
      // Check for certificate files
      const certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/litecat.crt';
      const keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/litecat.key';
      const caPath = process.env.SSL_CA_PATH || '/etc/ssl/certs/ca-bundle.crt';

      // Verify files exist
      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        logger.warn('SSL certificates not found, falling back to HTTP');
        return null;
      }

      this.options = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };

      // Add CA bundle if exists
      if (fs.existsSync(caPath)) {
        this.options.ca = fs.readFileSync(caPath);
      }

      // SSL configuration options
      this.options = {
        ...this.options,
        // Security options
        secureProtocol: 'TLSv1_2_method',
        honorCipherOrder: true,
        ciphers: [
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-SHA256',
          'ECDHE-RSA-AES256-SHA384',
          'ECDHE-RSA-AES128-SHA',
          'ECDHE-RSA-AES256-SHA',
          'DHE-RSA-AES128-GCM-SHA256',
          'DHE-RSA-AES256-GCM-SHA384',
          'DHE-RSA-AES128-SHA256',
          'DHE-RSA-AES256-SHA256',
          'DHE-RSA-AES128-SHA',
          'DHE-RSA-AES256-SHA',
          '!aNULL',
          '!eNULL',
          '!EXPORT',
          '!DES',
          '!RC4',
          '!MD5',
          '!PSK',
          '!SRP',
          '!CAMELLIA'
        ].join(':'),
        // HSTS
        requestCert: false,
        rejectUnauthorized: false
      };

      this.enabled = true;
      logger.info('SSL certificates loaded successfully');
      return this.options;

    } catch (error) {
      logger.error('Failed to load SSL certificates:', error);
      return null;
    }
  }

  // Generate self-signed certificate for development
  async generateSelfSigned() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const certDir = path.join(__dirname, '..', 'certs');
    const certPath = path.join(certDir, 'self-signed.crt');
    const keyPath = path.join(certDir, 'self-signed.key');

    // Create directory if not exists
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    // Check if certificates already exist
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      logger.info('Self-signed certificates already exist');
      return { cert: certPath, key: keyPath };
    }

    try {
      // Generate self-signed certificate
      const command = `openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Litecat/CN=localhost"`;
      
      await execAsync(command);
      logger.info('Generated self-signed certificate for development');
      
      return { cert: certPath, key: keyPath };
    } catch (error) {
      logger.error('Failed to generate self-signed certificate:', error);
      return null;
    }
  }

  // Create HTTPS redirect middleware
  createHTTPSRedirect() {
    return (req, res, next) => {
      if (!req.secure && req.get('X-Forwarded-Proto') !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect('https://' + req.get('Host') + req.url);
      }
      next();
    };
  }

  // Get security headers for HTTPS
  getSecurityHeaders() {
    return {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': this.getCSP(),
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Expect-CT': 'max-age=86400, enforce'
    };
  }

  getCSP() {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' wss: https://api.coinpayments.net",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'"
    ].join('; ');
  }
}

module.exports = new SSLConfig();