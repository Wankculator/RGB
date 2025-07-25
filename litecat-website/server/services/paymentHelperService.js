// Payment Helper Service - Business logic for payment processing
const crypto = require('crypto');

class PaymentHelperService {
  constructor() {
    this.PRICE_PER_BATCH_SATS = 2000;
    this.TOKENS_PER_BATCH = 700;
    this.INVOICE_EXPIRY_MINUTES = 15;
  }

  // Calculate payment details
  calculatePaymentDetails(batchCount) {
    const totalSats = batchCount * this.PRICE_PER_BATCH_SATS;
    const totalTokens = batchCount * this.TOKENS_PER_BATCH;
    const totalBTC = totalSats / 100000000;

    return {
      batchCount,
      totalSats,
      totalBTC,
      totalTokens,
      pricePerBatch: this.PRICE_PER_BATCH_SATS,
      tokensPerBatch: this.TOKENS_PER_BATCH
    };
  }

  // Generate invoice ID
  generateInvoiceId() {
    return crypto.randomUUID();
  }

  // Calculate expiry time
  calculateExpiryTime(minutes = null) {
    const expiryMinutes = minutes || this.INVOICE_EXPIRY_MINUTES;
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + expiryMinutes);
    return expiryTime.toISOString();
  }

  // Check if invoice expired
  isInvoiceExpired(expiryTime) {
    return new Date() > new Date(expiryTime);
  }

  // Format satoshi amount
  formatSatoshis(sats) {
    return sats.toLocaleString();
  }

  // Format BTC amount
  formatBTC(btc) {
    return btc.toFixed(8);
  }

  // Generate payment reference
  generatePaymentReference() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `LCAT-${timestamp}-${random}`.toUpperCase();
  }

  // Calculate fee
  calculateFee(amount, feePercentage = 0.5) {
    return Math.ceil(amount * (feePercentage / 100));
  }

  // Get tier from score
  getTierFromScore(score) {
    if (score >= 28) return 'gold';
    if (score >= 18) return 'silver';
    if (score >= 11) return 'bronze';
    return null;
  }

  // Get max batches for tier - CRITICAL: Mint is LOCKED
  getMaxBatchesForTier(tier) {
    const tierLimits = {
      bronze: 10,   // 10 batches for bronze
      silver: 20,   // 20 batches for silver
      gold: 30      // 30 batches for gold
    };
    return tierLimits[tier?.toLowerCase()] || 0; // 0 without tier - mint LOCKED
  }

  // Generate mock Lightning invoice
  generateMockLightningInvoice(amount) {
    const prefix = 'lnbc';
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}${amount}n${timestamp}${random}`;
  }

  // Parse Lightning invoice (basic)
  parseLightningInvoice(invoice) {
    const match = invoice.match(/^ln(bc|tb)(\d+)([munp]?)/);
    if (!match) return null;

    const [, network, amount, multiplier] = match;
    const multipliers = {
      m: 0.001,
      u: 0.000001,
      n: 0.000000001,
      p: 0.000000000001
    };

    const sats = Math.round(
      parseInt(amount) * (multipliers[multiplier] || 1) * 100000000
    );

    return {
      network: network === 'bc' ? 'mainnet' : 'testnet',
      amount: sats,
      invoice
    };
  }

  // Generate QR code data
  generateQRData(invoice, amount) {
    return {
      lightning: invoice.toUpperCase(),
      amount: amount,
      label: 'LIGHTCAT Token Purchase',
      message: `Purchase ${this.formatSatoshis(amount)} sats worth of LIGHTCAT`
    };
  }

  // Verify payment amount
  verifyPaymentAmount(expectedAmount, receivedAmount, tolerance = 0) {
    const difference = Math.abs(expectedAmount - receivedAmount);
    return difference <= tolerance;
  }

  // Generate consignment filename
  generateConsignmentFilename(invoiceId, batchCount) {
    const timestamp = new Date().toISOString().split('T')[0];
    return `lightcat_consignment_${invoiceId}_${batchCount}x700_${timestamp}.rgb`;
  }

  // Format payment status
  formatPaymentStatus(status) {
    const statusMap = {
      pending: 'Waiting for Payment',
      paid: 'Payment Received',
      confirmed: 'Payment Confirmed',
      delivered: 'Tokens Delivered',
      expired: 'Invoice Expired',
      failed: 'Payment Failed'
    };
    return statusMap[status] || status;
  }

  // Calculate confirmations needed
  getRequiredConfirmations(amount) {
    if (amount < 10000) return 1;      // < 0.0001 BTC
    if (amount < 100000) return 3;     // < 0.001 BTC
    if (amount < 1000000) return 6;    // < 0.01 BTC
    return 12;                          // >= 0.01 BTC
  }

  // Calculate total amount in sats
  calculateAmount(batchCount) {
    return batchCount * this.PRICE_PER_BATCH_SATS;
  }

  // Validate batch count
  validateBatchCount(batchCount) {
    return batchCount >= 1 && batchCount <= 10 && Number.isInteger(batchCount);
  }

  // Generate invoice description
  generateDescription(batchCount) {
    const tokens = batchCount * this.TOKENS_PER_BATCH;
    return `LIGHTCAT Token Purchase: ${batchCount} batch${batchCount > 1 ? 'es' : ''} (${tokens.toLocaleString()} tokens)`;
  }

  // Get status message
  getStatusMessage(status) {
    const messages = {
      pending: 'Waiting for payment...',
      paid: 'Payment received! Generating consignment...',
      delivered: 'Tokens delivered successfully!',
      expired: 'Invoice expired. Please create a new one.',
      failed: 'Payment failed. Please try again.'
    };
    return messages[status] || 'Unknown status';
  }
}

module.exports = new PaymentHelperService();