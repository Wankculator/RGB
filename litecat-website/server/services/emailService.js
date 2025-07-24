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

  async sendConsignmentReady(data) {
    const { email, invoiceId, tokenAmount, downloadUrl } = data;
    
    const content = `
      <h2 style="color: #FFFF00; text-align: center;">Your LIGHTCAT Tokens Are Ready!</h2>
      
      <p>Your LIGHTCAT token purchase has been confirmed and your RGB consignment is ready for download.</p>
      
      <div style="background: #1a1a1a; border: 2px solid #FFFF00; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2);">
              <span style="color: rgba(255, 255, 255, 0.7);">Invoice ID</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2); text-align: right;">
              <span style="color: #FFFF00; font-weight: bold; font-family: monospace;">${invoiceId}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2);">
              <span style="color: rgba(255, 255, 255, 0.7);">Token Amount</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2); text-align: right;">
              <span style="color: #FFFF00; font-weight: bold; font-family: monospace;">${tokenAmount.toLocaleString()} LIGHTCAT</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <span style="color: rgba(255, 255, 255, 0.7);">Download Available</span>
            </td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="color: #FFFF00; font-weight: bold; font-family: monospace;">7 days</span>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${downloadUrl}" class="button" style="background: #FFFF00; color: #000; padding: 15px 40px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block; text-transform: uppercase;">Download Consignment</a>
      </div>
      
      <div style="background: rgba(255, 0, 0, 0.1); border: 1px solid #FF5252; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <strong>Important:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Download your consignment within 7 days</li>
          <li>Save the file securely - this is your proof of ownership</li>
          <li>Use an RGB-compatible wallet to import the consignment</li>
          <li>Keep a backup of your consignment file</li>
        </ul>
      </div>
      
      <h3 style="color: #FFFF00; margin-top: 30px;">Next Steps</h3>
      <ol style="line-height: 1.8;">
        <li>Download the consignment file using the button above</li>
        <li>Open your RGB-compatible wallet</li>
        <li>Import the consignment file</li>
        <li>Your LIGHTCAT tokens will appear in your wallet</li>
      </ol>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your LIGHTCAT Tokens Are Ready!',
      template: 'consignment-ready',
      data: {
        content,
        ...data
      }
    });
  }

  async sendLightningInvoice(data) {
    const { email, invoiceId, lightningInvoice, amountSats, amountBTC, batches, tokens, expiresAt } = data;
    
    const expiryTime = new Date(expiresAt).toLocaleString();
    
    const content = `
      <h2 style="color: #FFFF00; text-align: center;">Lightning Invoice Created</h2>
      
      <p>Your LIGHTCAT token purchase invoice has been created. Please complete the payment within 30 minutes.</p>
      
      <div style="background: #1a1a1a; border: 2px solid #FFFF00; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #FFFF00; margin-bottom: 15px;">Purchase Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2);">
              <span style="color: rgba(255, 255, 255, 0.7);">Invoice ID</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2); text-align: right;">
              <span style="color: #FFFF00; font-weight: bold; font-family: monospace;">${invoiceId}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2);">
              <span style="color: rgba(255, 255, 255, 0.7);">Batches</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2); text-align: right;">
              <span style="color: #FFFF00; font-weight: bold; font-family: monospace;">${batches}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2);">
              <span style="color: rgba(255, 255, 255, 0.7);">Token Amount</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2); text-align: right;">
              <span style="color: #FFFF00; font-weight: bold; font-family: monospace;">${tokens.toLocaleString()} LIGHTCAT</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2);">
              <span style="color: rgba(255, 255, 255, 0.7);">Amount Due</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2); text-align: right;">
              <span style="color: #FFFF00; font-weight: bold; font-family: monospace;">${amountBTC} BTC (${amountSats.toLocaleString()} sats)</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <span style="color: rgba(255, 255, 255, 0.7);">Expires At</span>
            </td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="color: #FF5252; font-weight: bold;">${expiryTime}</span>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="background: #1a1a1a; border: 2px solid #FFFF00; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #FFFF00; margin-bottom: 15px;">Lightning Invoice</h3>
        <p style="word-break: break-all; font-family: monospace; font-size: 12px; line-height: 1.5; color: #FFFF00;">
          ${lightningInvoice}
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: rgba(255, 255, 255, 0.7);">Copy the Lightning invoice above and pay using your Lightning wallet</p>
      </div>
      
      <div style="background: rgba(255, 0, 0, 0.1); border: 1px solid #FF5252; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <strong>Important:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Payment must be completed within 30 minutes</li>
          <li>Once paid, your RGB consignment will be generated automatically</li>
          <li>You will receive an email when your tokens are ready</li>
          <li>NO REFUNDS - All sales are final</li>
        </ul>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Lightning Invoice - LIGHTCAT Purchase #${invoiceId}`,
      template: 'lightning-invoice',
      data: {
        content,
        ...data
      }
    });
  }

  async sendInvoiceCreated(email, data) {
    return this.sendLightningInvoice({
      email,
      invoiceId: data.invoiceId,
      lightningInvoice: data.lightningInvoice,
      amountSats: data.amount,
      amountBTC: (data.amount / 100000000).toFixed(8),
      batches: data.batchCount || Math.floor(data.amount / 2000),
      tokens: (data.batchCount || Math.floor(data.amount / 2000)) * 700,
      expiresAt: data.expiresAt || new Date(Date.now() + 30 * 60 * 1000)
    });
  }

  async sendPaymentConfirmed(email, data) {
    const { invoiceId, amount, downloadUrl, consignment } = data;
    
    const content = `
      <h2 style="color: #FFFF00; text-align: center;">🎉 Payment Confirmed!</h2>
      
      <p>Your Lightning payment has been confirmed and your LIGHTCAT tokens are ready!</p>
      
      <div style="background: #1a1a1a; border: 2px solid #FFFF00; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2);">
              <span style="color: rgba(255, 255, 255, 0.7);">Invoice ID</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 0, 0.2); text-align: right;">
              <span style="color: #FFFF00; font-weight: bold; font-family: monospace;">${invoiceId}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <span style="color: rgba(255, 255, 255, 0.7);">Token Amount</span>
            </td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="color: #FFFF00; font-weight: bold; font-family: monospace;">${amount.toLocaleString()} LIGHTCAT</span>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${downloadUrl}" class="button" style="background: #FFFF00; color: #000; padding: 15px 40px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block; text-transform: uppercase;">Download RGB Consignment</a>
      </div>
      
      <div style="background: rgba(255, 255, 0, 0.1); border: 1px solid #FFFF00; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <strong>What's Next?</strong>
        <ol style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
          <li>Download the consignment file using the button above</li>
          <li>Save it securely - this is your proof of token ownership</li>
          <li>Import the consignment into your RGB-compatible wallet</li>
          <li>Your LIGHTCAT tokens will appear in your wallet</li>
        </ol>
      </div>
      
      <div style="background: rgba(255, 0, 0, 0.1); border: 1px solid #FF5252; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <strong>Important Security Notes:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Keep your consignment file safe - losing it means losing access to your tokens</li>
          <li>Make backups of the consignment file</li>
          <li>Never share your consignment file with anyone</li>
          <li>The download link expires in 7 days</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: rgba(255, 255, 255, 0.7);">Thank you for joining the LIGHTCAT community!</p>
        <p style="color: #FFFF00; font-size: 24px;">🐱⚡</p>
      </div>
    `;

    // Send email with consignment as attachment if available
    const attachments = [];
    if (consignment) {
      attachments.push({
        filename: `lightcat-consignment-${invoiceId}.rgb`,
        content: Buffer.from(consignment, 'base64'),
        contentType: 'application/octet-stream'
      });
    }

    return this.sendEmail({
      to: email,
      subject: `✅ Your LIGHTCAT Tokens Are Ready - Invoice #${invoiceId}`,
      template: 'payment-confirmed',
      data: {
        content,
        ...data
      },
      attachments
    });
  }
}

module.exports = new EmailService();