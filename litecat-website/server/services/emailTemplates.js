// Email Templates - Extracted from emailService to reduce file size
const config = require('../../config');

class EmailTemplates {
  // Base template wrapper
  getBaseTemplate(content, title = 'LIGHTCAT') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .title {
      font-size: 32px;
      color: #ffff00;
      text-shadow: 0 0 20px rgba(255, 255, 0, 0.5);
      margin: 0;
    }
    .content {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 0, 0.2);
      border-radius: 20px;
      padding: 40px;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #ffff00, #ffcc00);
      color: #000000;
      text-decoration: none;
      padding: 15px 40px;
      border-radius: 50px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
    }
    .warning {
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      padding: 15px;
      border-radius: 10px;
      margin: 20px 0;
      color: #ff6666;
    }
    .success {
      background: rgba(0, 255, 0, 0.1);
      border: 1px solid rgba(0, 255, 0, 0.3);
      padding: 15px;
      border-radius: 10px;
      margin: 20px 0;
      color: #66ff66;
    }
    .code {
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 15px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      word-break: break-all;
      margin: 20px 0;
    }
    .highlight {
      color: #ffff00;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🐱⚡</div>
      <h1 class="title">LIGHTCAT</h1>
      <p style="color: rgba(255, 255, 255, 0.8);">First Cat Meme Token on RGB Protocol</p>
    </div>
    ${content}
    <div class="footer">
      <p>© 2025 LIGHTCAT. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
      <p style="margin-top: 20px;">
        <a href="${config.CLIENT_URL}" style="color: #ffff00;">Visit Website</a> | 
        <a href="https://twitter.com/RGBLightCat" style="color: #ffff00;">Follow on Twitter</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  // Welcome email template
  getWelcomeEmail(data) {
    const content = `
    <div class="content">
      <h2 style="color: #ffff00; margin-top: 0;">Welcome to LIGHTCAT! 🎉</h2>
      <p>Thank you for joining the first cat meme token on the RGB Protocol!</p>
      
      <h3>What's Next?</h3>
      <ul style="line-height: 1.8;">
        <li>Play our game to unlock purchase tiers</li>
        <li>Score 11+ points to unlock Bronze tier (5 batches max)</li>
        <li>Score 18+ points to unlock Silver tier (8 batches max)</li>
        <li>Score 28+ points to unlock Gold tier (10 batches max)</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="${config.CLIENT_URL}/game" class="button">Play Game Now</a>
      </div>
      
      <h3>Token Details</h3>
      <p>🐱 Total Supply: 21,000,000 LIGHTCAT</p>
      <p>💰 Price: 2,000 sats per batch (700 tokens)</p>
      <p>⚡ Payment: Lightning Network only</p>
      <p>🔐 Protocol: RGB on Bitcoin</p>
    </div>`;
    
    return this.getBaseTemplate(content, 'Welcome to LIGHTCAT!');
  }

  // Invoice created email template
  getInvoiceCreatedEmail(data) {
    const content = `
    <div class="content">
      <h2 style="color: #ffff00; margin-top: 0;">Lightning Invoice Created ⚡</h2>
      <p>Your LIGHTCAT purchase invoice has been created successfully!</p>
      
      <h3>Invoice Details</h3>
      <p><strong>Invoice ID:</strong> <span class="highlight">${data.invoiceId}</span></p>
      <p><strong>Amount:</strong> <span class="highlight">${data.amount.toLocaleString()} sats</span></p>
      <p><strong>Expires:</strong> ${new Date(data.expiresAt).toLocaleString()}</p>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> This invoice expires in 15 minutes. Please complete payment before expiration.
      </div>
      
      <h3>Lightning Invoice</h3>
      <div class="code">${data.lightningInvoice}</div>
      
      <div style="text-align: center;">
        <a href="${config.CLIENT_URL}/purchase?invoice=${data.invoiceId}" class="button">View Invoice</a>
      </div>
      
      <p style="margin-top: 30px; color: rgba(255, 255, 255, 0.8);">
        <strong>How to pay:</strong><br>
        1. Copy the Lightning invoice above<br>
        2. Open your Lightning wallet<br>
        3. Paste and confirm payment<br>
        4. Your RGB consignment will be generated automatically
      </p>
    </div>`;
    
    return this.getBaseTemplate(content, 'Lightning Invoice Created - LIGHTCAT');
  }

  // Payment confirmed email template
  getPaymentConfirmedEmail(data) {
    const content = `
    <div class="content">
      <h2 style="color: #ffff00; margin-top: 0;">Payment Confirmed! 🎉</h2>
      <p>Your Lightning payment has been received and your LIGHTCAT tokens are ready!</p>
      
      <div class="success">
        <strong>✅ Success!</strong> You now own <span class="highlight">${data.amount.toLocaleString()}</span> LIGHTCAT tokens!
      </div>
      
      <h3>Transaction Details</h3>
      <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>
      <p><strong>Amount:</strong> ${data.amount.toLocaleString()} LIGHTCAT</p>
      <p><strong>Payment Hash:</strong> ${data.paymentHash || 'N/A'}</p>
      <p><strong>Confirmed At:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>Download Your RGB Consignment</h3>
      <p>Your RGB consignment file is ready for download. Import this file into your RGB wallet to receive your tokens.</p>
      
      <div style="text-align: center;">
        <a href="${config.CLIENT_URL}${data.downloadUrl}" class="button">Download Consignment</a>
      </div>
      
      <h3>Next Steps</h3>
      <ol style="line-height: 1.8;">
        <li>Download the consignment file above</li>
        <li>Open your RGB-compatible wallet (e.g., BitMask, Iris)</li>
        <li>Import the consignment file</li>
        <li>Your LIGHTCAT tokens will appear in your wallet</li>
      </ol>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> Keep your consignment file safe! This is your proof of ownership for the RGB tokens.
      </div>
    </div>`;
    
    return this.getBaseTemplate(content, 'Payment Confirmed - LIGHTCAT');
  }

  // Payment failed email template
  getPaymentFailedEmail(data) {
    const content = `
    <div class="content">
      <h2 style="color: #ff6666; margin-top: 0;">Payment Failed ❌</h2>
      <p>Unfortunately, there was an issue with your payment.</p>
      
      <div class="warning">
        <strong>Reason:</strong> ${data.reason || 'Payment was not completed or expired'}
      </div>
      
      <h3>What Happened?</h3>
      <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>
      <p><strong>Status:</strong> ${data.status || 'Failed'}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>What Can You Do?</h3>
      <p>Don't worry! You can create a new invoice and try again:</p>
      
      <div style="text-align: center;">
        <a href="${config.CLIENT_URL}/purchase" class="button">Try Again</a>
      </div>
      
      <h3>Common Issues</h3>
      <ul style="line-height: 1.8;">
        <li><strong>Invoice Expired:</strong> Lightning invoices expire after 15 minutes</li>
        <li><strong>Insufficient Balance:</strong> Make sure you have enough sats in your Lightning wallet</li>
        <li><strong>Network Issues:</strong> Check your internet connection and try again</li>
        <li><strong>Wallet Issues:</strong> Ensure your Lightning wallet is properly connected</li>
      </ul>
      
      <p style="margin-top: 30px;">
        Need help? Contact support at <a href="mailto:support@lightcat.io" style="color: #ffff00;">support@lightcat.io</a>
      </p>
    </div>`;
    
    return this.getBaseTemplate(content, 'Payment Failed - LIGHTCAT');
  }

  // Admin notification template
  getAdminNotificationEmail(data) {
    const content = `
    <div class="content">
      <h2 style="color: #ffff00; margin-top: 0;">${data.subject}</h2>
      <p>${data.message}</p>
      
      ${data.details ? `
      <h3>Details</h3>
      <div class="code">
        ${JSON.stringify(data.details, null, 2)}
      </div>
      ` : ''}
      
      <p style="margin-top: 30px;">
        <strong>Time:</strong> ${new Date().toLocaleString()}<br>
        <strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}
      </p>
    </div>`;
    
    return this.getBaseTemplate(content, data.subject);
  }

  // Purchase summary email template
  getPurchaseSummaryEmail(data) {
    const content = `
    <div class="content">
      <h2 style="color: #ffff00; margin-top: 0;">Purchase Summary 📊</h2>
      <p>Here's a summary of your LIGHTCAT token purchases:</p>
      
      <h3>Total Holdings</h3>
      <p style="font-size: 24px;">
        <span class="highlight">${data.totalTokens.toLocaleString()}</span> LIGHTCAT
      </p>
      
      <h3>Purchase History</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
            <th style="padding: 10px; text-align: left;">Date</th>
            <th style="padding: 10px; text-align: right;">Amount</th>
            <th style="padding: 10px; text-align: right;">Price (sats)</th>
          </tr>
        </thead>
        <tbody>
          ${data.purchases.map(p => `
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <td style="padding: 10px;">${new Date(p.date).toLocaleDateString()}</td>
            <td style="padding: 10px; text-align: right;">${p.amount.toLocaleString()}</td>
            <td style="padding: 10px; text-align: right;">${p.price.toLocaleString()}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid rgba(255, 255, 0, 0.5);">
            <td style="padding: 10px; font-weight: bold;">Total</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">
              ${data.totalTokens.toLocaleString()}
            </td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">
              ${data.totalSpent.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
      
      <div style="text-align: center; margin-top: 40px;">
        <a href="${config.CLIENT_URL}/account" class="button">View Account</a>
      </div>
    </div>`;
    
    return this.getBaseTemplate(content, 'Purchase Summary - LIGHTCAT');
  }
}

module.exports = new EmailTemplates();