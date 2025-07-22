const nodemailer = require('nodemailer');
const config = require('../../config');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    // Check if SendGrid is configured
    if (config.email.sendgridApiKey && config.email.sendgridApiKey !== 'not-configured') {
      // Use SendGrid
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: config.email.sendgridApiKey,
        },
      });
      logger.info('Email service configured with SendGrid');
    } else {
      // Use a dummy transporter that logs emails
      this.transporter = {
        sendMail: async (options) => {
          logger.info('Email (not sent - SendGrid not configured):', {
            to: options.to,
            subject: options.subject,
            from: options.from
          });
          return { messageId: `dummy-${Date.now()}` };
        },
        verify: async () => true
      };
      logger.warn('SendGrid not configured - emails will be logged only');
    }

    this.templates = new Map();
    this.defaultFrom = config.email.from || 'noreply@litecat.com';
    this.loadTemplates();
  }

  async loadTemplates() {
    const templateDir = path.join(__dirname, '../templates/email');
    
    try {
      const files = await fs.readdir(templateDir);
      
      for (const file of files) {
        if (file.endsWith('.html')) {
          const templateName = file.replace('.html', '');
          const content = await fs.readFile(path.join(templateDir, file), 'utf8');
          this.templates.set(templateName, content);
        }
      }
      
      logger.info(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates:', error);
    }
  }

  async sendEmail(options) {
    const {
      to,
      subject,
      template,
      data = {},
      attachments = [],
      cc = null,
      bcc = null,
      replyTo = null,
    } = options;

    try {
      const html = await this.renderTemplate(template, data);
      
      const mailOptions = {
        from: this.defaultFrom,
        to,
        subject,
        html,
        attachments,
      };

      if (cc) mailOptions.cc = cc;
      if (bcc) mailOptions.bcc = bcc;
      if (replyTo) mailOptions.replyTo = replyTo;

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully:', {
        messageId: result.messageId,
        to,
        subject,
        template,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      logger.error('Failed to send email:', {
        to,
        subject,
        template,
        error: error.message,
      });
      throw error;
    }
  }

  async sendPurchaseConfirmation(purchase) {
    const data = {
      walletAddress: purchase.wallet_address,
      batchCount: purchase.batch_count,
      totalTokens: purchase.total_tokens,
      totalSatoshis: purchase.total_satoshis,
      transactionId: purchase.coinpayments_id,
      paymentAddress: purchase.payment_address,
      tier: purchase.game_tier,
      purchaseDate: new Date(purchase.created_at).toLocaleString(),
    };

    return this.sendEmail({
      to: purchase.email || purchase.wallet_address,
      subject: `🐱⚡ Litecat Token Purchase Confirmation - ${purchase.batch_count} Batch${purchase.batch_count > 1 ? 'es' : ''}`,
      template: 'purchase-confirmation',
      data,
    });
  }

  async sendPaymentReceived(purchase) {
    const data = {
      walletAddress: purchase.wallet_address,
      batchCount: purchase.batch_count,
      totalTokens: purchase.total_tokens,
      transactionHash: purchase.transaction_hash,
      confirmations: purchase.confirmations || 0,
      estimatedTime: '10-30 minutes',
    };

    return this.sendEmail({
      to: purchase.email || purchase.wallet_address,
      subject: '🎉 Payment Received - Litecat Tokens Coming Soon!',
      template: 'payment-received',
      data,
    });
  }

  async sendTokensDistributed(purchase, rgbTransfer) {
    const data = {
      walletAddress: purchase.wallet_address,
      batchCount: purchase.batch_count,
      totalTokens: purchase.total_tokens,
      rgbTransferId: rgbTransfer.transferId,
      consignment: rgbTransfer.consignment,
      bitcoinTxid: purchase.transaction_hash,
      viewUrl: `https://litecat.xyz/tokens/${purchase.wallet_address}`,
    };

    return this.sendEmail({
      to: purchase.email || purchase.wallet_address,
      subject: '✅ Your Litecat Tokens Have Been Distributed!',
      template: 'tokens-distributed',
      data,
    });
  }

  async sendWelcome(walletAddress, email) {
    const data = {
      walletAddress,
      dashboardUrl: 'https://litecat.xyz/dashboard',
      communityUrl: 'https://t.me/litecattoken',
      docsUrl: 'https://docs.litecat.xyz',
    };

    return this.sendEmail({
      to: email || walletAddress,
      subject: '🐱⚡ Welcome to the Litecat Community!',
      template: 'welcome',
      data,
    });
  }

  async sendSecurityAlert(user, alertType, details) {
    const data = {
      alertType,
      timestamp: new Date().toISOString(),
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      location: details.location || 'Unknown',
      actionRequired: details.actionRequired || false,
      supportUrl: 'https://litecat.xyz/support',
    };

    return this.sendEmail({
      to: user.email,
      subject: `🔐 Security Alert: ${alertType}`,
      template: 'security-alert',
      data,
    });
  }

  async sendAdminNotification(subject, message, data = {}) {
    const adminEmails = [config.admin.email || config.email.supportEmail];

    return this.sendEmail({
      to: adminEmails,
      subject: `[Admin] ${subject}`,
      template: 'admin-notification',
      data: {
        message,
        timestamp: new Date().toISOString(),
        environment: config.server.env,
        ...data,
      },
    });
  }

  async sendBatchEmail(recipients, template, commonData = {}) {
    const results = [];
    const batchSize = 50;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(recipient => {
        const data = {
          ...commonData,
          ...recipient.data,
        };

        return this.sendEmail({
          to: recipient.email,
          subject: recipient.subject || commonData.subject,
          template,
          data,
        }).catch(error => ({
          success: false,
          email: recipient.email,
          error: error.message,
        }));
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info('Batch email completed:', {
      total: recipients.length,
      successful,
      failed,
      template,
    });

    return {
      total: recipients.length,
      successful,
      failed,
      results,
    };
  }

  async renderTemplate(templateName, data) {
    let template = this.templates.get(templateName);
    
    if (!template) {
      template = this.getDefaultTemplate();
    }

    const commonData = {
      year: new Date().getFullYear(),
      appName: 'Litecat Token',
      appUrl: 'https://litecat.xyz',
      logoUrl: 'https://litecat.xyz/assets/images/logo.png',
      supportEmail: 'support@litecat.xyz',
      unsubscribeUrl: `https://litecat.xyz/unsubscribe?email=${encodeURIComponent(data.email || '')}`,
      ...data,
    };

    return this.interpolate(template, commonData);
  }

  interpolate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data.hasOwnProperty(key) ? data[key] : match;
    });
  }

  getDefaultTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{subject}}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #000;
            color: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: #000;
            padding: 30px;
            text-align: center;
            border-bottom: 3px solid #FFFF00;
          }
          .logo {
            width: 120px;
            height: auto;
          }
          .content {
            padding: 40px 30px;
          }
          .footer {
            background: #111;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #999;
          }
          a {
            color: #FFFF00;
            text-decoration: none;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #FFFF00;
            color: #000;
            border-radius: 4px;
            font-weight: bold;
            text-decoration: none;
            margin: 20px 0;
          }
          .highlight {
            color: #FFFF00;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="{{logoUrl}}" alt="{{appName}}" class="logo">
            <h1 style="color: #FFFF00; margin: 20px 0 0;">{{appName}}</h1>
          </div>
          <div class="content">
            {{content}}
          </div>
          <div class="footer">
            <p>&copy; {{year}} {{appName}}. All rights reserved.</p>
            <p>
              <a href="{{appUrl}}">Visit Website</a> | 
              <a href="mailto:{{supportEmail}}">Contact Support</a> | 
              <a href="{{unsubscribeUrl}}">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }

  async sendTestEmail(to) {
    return this.sendEmail({
      to,
      subject: 'Test Email - Litecat Token Platform',
      template: 'test',
      data: {
        content: `
          <h2>Test Email Successful!</h2>
          <p>This is a test email from the Litecat Token platform.</p>
          <p>If you're receiving this, your email configuration is working correctly.</p>
          <p class="highlight">🐱⚡ Meow with the power of lightning!</p>
        `,
      },
    });
  }

  async checkHealth() {
    try {
      if (this.transporter.verify) {
        await this.transporter.verify();
        return true;
      }
      return true;
    } catch (error) {
      logger.error('Email service health check failed:', error);
      return false;
    }
  }

  async sendPaymentCancelled(data) {
    return this.sendEmail({
      to: data.email,
      subject: 'Payment Cancelled - Litecat Token',
      template: 'payment-cancelled',
      data: {
        content: `
          <h2>Payment Cancelled</h2>
          <p>Your payment for Litecat tokens has been cancelled.</p>
          <p>Transaction ID: ${data.transactionId}</p>
          <p>If you believe this is an error, please contact support.</p>
        `,
        ...data
      }
    });
  }

  async sendPaymentFailed(data) {
    return this.sendEmail({
      to: data.email,
      subject: 'Payment Failed - Litecat Token',
      template: 'payment-failed',
      data: {
        content: `
          <h2>Payment Failed</h2>
          <p>Unfortunately, your payment for Litecat tokens has failed.</p>
          <p>Transaction ID: ${data.transactionId}</p>
          <p>Reason: ${data.reason}</p>
          <p>Please try again or contact support if you need assistance.</p>
        `,
        ...data
      }
    });
  }
}

module.exports = new EmailService();