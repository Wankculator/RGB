// Refactored RGB Payment Controller - Under 500 lines
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');
const lightningService = require('../services/lightningService');
const rgbService = require('../services/rgbService');
const emailService = require('../services/emailService');
const validationService = require('../services/validationService');
const paymentHelper = require('../services/paymentHelperService');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class RGBPaymentController {
  /**
   * Create Lightning invoice for RGB token purchase
   */
  async createInvoice(req, res) {
    try {
      const { email, rgbInvoice, tier } = req.body;
      let batchCount = parseInt(req.body.batchCount);
      
      // Handle NaN or invalid values
      if (isNaN(batchCount) || batchCount === null || batchCount === undefined) {
        batchCount = 1;
      }

      // Validate RGB invoice
      const rgbValidation = validationService.validateRGBInvoice(rgbInvoice);
      if (!rgbValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: rgbValidation.error
        });
      }

      // Validate batch count with tier limits
      const batchValidation = validationService.validateBatchCount(batchCount, tier);
      if (!batchValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: batchValidation.error
        });
      }

      // Check if mint is closed
      const mintStatus = await this._checkMintStatus();
      if (mintStatus.closed) {
        return res.status(400).json({
          success: false,
          error: mintStatus.message
        });
      }

      // Calculate payment details
      const paymentDetails = paymentHelper.calculatePaymentDetails(batchCount);
      
      // Generate invoice ID and reference
      const invoiceId = paymentHelper.generateInvoiceId();
      const reference = paymentHelper.generatePaymentReference();

      // Create Lightning invoice
      const lightningInvoice = await lightningService.createInvoice({
        amount: paymentDetails.totalSats,
        memo: `LIGHTCAT Purchase - ${paymentDetails.batchCount} batches (${paymentDetails.totalTokens} tokens)`,
        expiry: 900 // 15 minutes
      });

      // Save to database
      await this._saveInvoice({
        invoiceId,
        email,
        rgbInvoice,
        lightningInvoice: lightningInvoice.payment_request,
        paymentHash: lightningInvoice.r_hash,
        amount: paymentDetails.totalSats,
        batchCount: paymentDetails.batchCount,
        tokenAmount: paymentDetails.totalTokens,
        reference
      });

      // Send confirmation email if provided
      if (email) {
        const emailValidation = validationService.validateEmail(email);
        if (emailValidation.isValid) {
          await emailService.sendInvoiceCreated(email, {
            invoiceId,
            amount: paymentDetails.totalSats,
            lightningInvoice: lightningInvoice.payment_request
          });
        }
      }

      logger.info('Lightning invoice created', {
        invoiceId,
        amount: paymentDetails.totalSats,
        batchCount: paymentDetails.batchCount
      });

      return res.json({
        success: true,
        invoiceId,
        lightningInvoice: lightningInvoice.payment_request,
        amount: paymentDetails.totalSats,
        expiresAt: paymentHelper.calculateExpiryTime()
      });

    } catch (error) {
      logger.error('Failed to create invoice:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create invoice'
      });
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(req, res) {
    try {
      const { invoiceId } = req.params;

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          error: 'Invoice ID is required'
        });
      }

      // Get invoice from database
      const { data: invoice, error } = await supabase
        .from('rgb_purchases')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single();

      if (error || !invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }

      // Check if expired
      if (paymentHelper.isInvoiceExpired(invoice.expires_at)) {
        return res.json({
          success: true,
          status: 'expired',
          message: 'Invoice has expired'
        });
      }

      // Check Lightning payment status
      if (invoice.payment_hash && invoice.status === 'pending') {
        const paymentStatus = await lightningService.checkInvoiceStatus(
          invoice.payment_hash
        );

        if (paymentStatus.settled) {
          await this._handlePaymentReceived(invoice);
        }
      }

      // Return current status
      return res.json({
        success: true,
        status: invoice.status,
        consignment: invoice.status === 'delivered' ? invoice.consignment_file : null
      });

    } catch (error) {
      logger.error('Failed to check payment status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check payment status'
      });
    }
  }

  /**
   * Download consignment file
   */
  async downloadConsignment(req, res) {
    try {
      const { invoiceId } = req.params;

      // Get purchase record
      const { data: purchase, error } = await supabase
        .from('rgb_purchases')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single();

      if (error || !purchase) {
        return res.status(404).json({
          success: false,
          error: 'Purchase not found'
        });
      }

      if (purchase.status !== 'delivered' || !purchase.consignment_file) {
        return res.status(400).json({
          success: false,
          error: 'Consignment not available'
        });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(purchase.consignment_file, 'base64');
      const filename = paymentHelper.generateConsignmentFilename(
        invoiceId,
        purchase.batch_count
      );

      // Set headers for file download
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length
      });

      return res.send(buffer);

    } catch (error) {
      logger.error('Failed to download consignment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to download consignment'
      });
    }
  }

  /**
   * Get current sales statistics
   */
  async getStats(req, res) {
    try {
      const stats = await this._getSalesStats();
      
      return res.json({
        success: true,
        stats
      });

    } catch (error) {
      logger.error('Failed to get stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  }

  /**
   * Webhook handler for Lightning payments
   */
  async handleLightningWebhook(req, res) {
    try {
      const { invoice, status, amount, paymentHash } = req.body;

      // Validate webhook data
      if (!paymentHash || !status) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook data'
        });
      }

      // Find the purchase
      const { data: purchase, error } = await supabase
        .from('rgb_purchases')
        .select('*')
        .eq('payment_hash', paymentHash)
        .single();

      if (error || !purchase) {
        logger.warn('Webhook for unknown payment:', paymentHash);
        return res.json({ success: true });
      }

      // Handle payment based on status
      if (status === 'paid' && purchase.status === 'pending') {
        await this._handlePaymentReceived(purchase);
      }

      return res.json({ success: true });

    } catch (error) {
      logger.error('Webhook processing failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  }

  // Private helper methods
  async _checkMintStatus() {
    const { data: salesData } = await supabase
      .from('rgb_sales_stats')
      .select('mint_closed, total_batches_sold')
      .single();
    
    if (salesData?.mint_closed) {
      return {
        closed: true,
        message: 'Token sale has ended'
      };
    }

    if (salesData?.total_batches_sold >= 30000) {
      return {
        closed: true,
        message: 'All tokens have been sold'
      };
    }

    return { closed: false };
  }

  async _saveInvoice(invoiceData) {
    const { error } = await supabase
      .from('rgb_purchases')
      .insert({
        invoice_id: invoiceData.invoiceId,
        email: invoiceData.email,
        rgb_invoice: invoiceData.rgbInvoice,
        lightning_invoice: invoiceData.lightningInvoice,
        payment_hash: invoiceData.paymentHash,
        amount_sats: invoiceData.amount,
        batch_count: invoiceData.batchCount,
        token_amount: invoiceData.tokenAmount,
        reference: invoiceData.reference,
        status: 'pending',
        expires_at: paymentHelper.calculateExpiryTime()
      });

    if (error) {
      throw new Error('Failed to save invoice: ' + error.message);
    }
  }

  async _handlePaymentReceived(purchase) {
    try {
      // Update status to paid
      await supabase
        .from('rgb_purchases')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('invoice_id', purchase.invoice_id);

      // Generate RGB consignment
      const consignment = await rgbService.generateConsignment({
        rgbInvoice: purchase.rgb_invoice,
        amount: purchase.token_amount,
        invoiceId: purchase.invoice_id
      });

      // Update with consignment
      await supabase
        .from('rgb_purchases')
        .update({
          status: 'delivered',
          consignment_file: consignment,
          delivered_at: new Date().toISOString()
        })
        .eq('invoice_id', purchase.invoice_id);

      // Update sales statistics
      await this._updateSalesStats(purchase);

      // Send confirmation email
      if (purchase.email) {
        await emailService.sendPaymentConfirmed(purchase.email, {
          invoiceId: purchase.invoice_id,
          amount: purchase.token_amount,
          downloadUrl: `/api/rgb/download/${purchase.invoice_id}`
        });
      }

      logger.info('Payment processed successfully', {
        invoiceId: purchase.invoice_id,
        amount: purchase.amount_sats
      });

    } catch (error) {
      logger.error('Failed to handle payment:', error);
      throw error;
    }
  }

  async _updateSalesStats(purchase) {
    const { data: current } = await supabase
      .from('rgb_sales_stats')
      .select('*')
      .single();

    const updates = {
      total_sold: (current?.total_sold || 0) + purchase.token_amount,
      total_batches_sold: (current?.total_batches_sold || 0) + purchase.batch_count,
      unique_buyers: (current?.unique_buyers || 0) + 1,
      last_sale_at: new Date().toISOString()
    };

    await supabase
      .from('rgb_sales_stats')
      .upsert(updates);
  }

  async _getSalesStats() {
    const { data: stats } = await supabase
      .from('rgb_sales_stats')
      .select('*')
      .single();

    return {
      totalSold: stats?.total_sold || 0,
      batchesSold: stats?.total_batches_sold || 0,
      remainingBatches: 30000 - (stats?.total_batches_sold || 0),
      uniqueBuyers: stats?.unique_buyers || 0,
      percentSold: ((stats?.total_batches_sold || 0) / 30000 * 100).toFixed(2),
      mintClosed: stats?.mint_closed || false
    };
  }
}

module.exports = new RGBPaymentController();