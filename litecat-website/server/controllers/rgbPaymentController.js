// Refactored RGB Payment Controller - Using DatabaseService
const { logger } = require('../utils/logger');
const LightningServiceFactory = require('../services/lightningServiceFactory');
const lightningService = LightningServiceFactory.create();
const rgbService = require('../services/rgbService');
const EnhancedRGBService = require('../services/enhancedRgbService');
const enhancedRgbService = new EnhancedRGBService();
const emailService = require('../services/emailService');
const validationService = require('../services/validationService');
const paymentHelper = require('../services/paymentHelperService');
const transactionManager = require('../middleware/transactionManager');
const constants = require('../config/constants');

class RGBPaymentController {
  /**
   * Create Lightning invoice for RGB token purchase
   */
  async createInvoice(req, res) {
    try {
      const { rgbInvoice, batchCount, email, tier } = req.body;

      // Validate inputs
      const validation = validationService.validateRGBInvoice(rgbInvoice);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }

      // Validate tier-based batch count - CRITICAL: Mint is LOCKED
      const tierLimits = constants.TIER_LIMITS;

      // CRITICAL: Check if tier is provided - mint is LOCKED without game play
      if (!tier) {
        logger.warn(`Rejecting purchase: ${batchCount} batches requested without tier - mint is LOCKED`);
        return res.status(400).json({
          success: false,
          error: 'Mint is locked! You must play the game to unlock purchasing. Score 11+ for Bronze tier.'
        });
      }

      // Validate batch count against tier limit
      if (tier && tierLimits[tier]) {
        if (batchCount > tierLimits[tier]) {
          return res.status(400).json({
            success: false,
            error: `Maximum ${tierLimits[tier]} batches allowed for ${tier} tier`
          });
        }
      }

      // Basic batch count validation
      if (!paymentHelper.validateBatchCount(batchCount)) {
        return res.status(400).json({
          success: false,
          error: `Invalid batch count. Must be between 1 and ${constants.MAX_BATCH_PURCHASE}.`
        });
      }

      // Check if mint is still open
      const mintStatus = await this._checkMintStatus(req);
      if (mintStatus.isClosed) {
        return res.status(400).json({
          success: false,
          error: 'Token sale has ended',
          remainingBatches: 0
        });
      }

      // Calculate amount
      const amountSats = paymentHelper.calculateAmount(batchCount);
      const description = paymentHelper.generateDescription(batchCount);

      // Check if testnet mode
      const isTestnet = req.headers['x-network'] === 'testnet' || 
                       process.env.USE_TESTNET === 'true';
      
      // Create Lightning invoice
      const lightningInvoice = await lightningService.createInvoice({
        amount: amountSats,
        description,
        expiryMinutes: 15,
        orderId: `rgb-${Date.now()}`,
        buyerEmail: email,
        metadata: {
          rgbInvoice,
          batchCount,
          network: isTestnet ? 'testnet' : 'mainnet',
          ...req.body.metadata
        }
      });

      // Prepare invoice data
      const invoiceData = {
        invoice_id: lightningInvoice.id,
        rgb_invoice: rgbInvoice,
        batch_count: batchCount,
        amount_sats: amountSats,
        payment_hash: lightningInvoice.payment_hash,
        payment_request: lightningInvoice.payment_request,
        status: 'pending',
        expires_at: lightningInvoice.expires_at,
        wallet_address: validationService.extractWalletAddress(rgbInvoice),
        email: email || null,
        token_amount: batchCount * 700
      };

      // Save to database within transaction
      const invoice = await req.databaseService.createPurchase(invoiceData);

      if (!invoice) {
        throw new Error('Failed to save invoice');
      }
      
      // Commit transaction on success
      if (req.commitTransaction) {
        await req.commitTransaction();
      }

      // Log invoice creation
      logger.info('RGB invoice created', {
        invoiceId: invoice.invoice_id,
        batchCount,
        amount: amountSats
      });

      // Send email if provided
      if (email) {
        await emailService.sendInvoiceCreated(email, {
          invoiceId: invoice.invoice_id,
          amount: amountSats,
          expiresAt: invoice.expires_at
        }).catch(err => {
          logger.error('Failed to send invoice email:', err);
        });
      }

      // Return response
      return res.json({
        success: true,
        invoiceId: invoice.invoice_id,
        lightningInvoice: invoice.payment_request,
        amount: amountSats,
        expiresAt: invoice.expires_at,
        qrCode: `lightning:${invoice.payment_request}`,
        remainingBatches: mintStatus.remainingBatches - batchCount
      });

    } catch (error) {
      logger.error('Failed to create RGB invoice:', error);
      
      // Rollback transaction on error
      if (req.rollbackTransaction) {
        await req.rollbackTransaction();
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create invoice. Please try again.'
      });
    }
  }

  /**
   * Check payment status and deliver RGB consignment if paid
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
      const invoice = await req.databaseService.getPurchase(invoiceId);

      if (!invoice) {
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

        if (paymentStatus.isPaid) {
          // Process the payment
          await this._handlePaymentReceived(req, invoice);
          
          // Get updated invoice
          const updatedInvoice = await req.databaseService.getPurchase(invoiceId);
          
          return res.json({
            success: true,
            status: 'paid',
            consignment: updatedInvoice.consignment_file,
            message: 'Payment received! Your RGB tokens are ready.'
          });
        }
      }

      // Return current status
      return res.json({
        success: true,
        status: invoice.status,
        consignment: invoice.status === 'delivered' ? invoice.consignment_file : null,
        message: paymentHelper.getStatusMessage(invoice.status)
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
   * Download RGB consignment file
   */
  async downloadConsignment(req, res) {
    try {
      const { invoiceId } = req.params;

      // Get purchase record
      const purchase = await req.databaseService.getPurchase(invoiceId);

      if (!purchase) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }

      // Check if payment is complete
      if (purchase.status !== 'delivered' || !purchase.consignment_file) {
        return res.status(400).json({
          success: false,
          error: 'Payment not complete or consignment not ready'
        });
      }

      // Prepare file download
      const consignmentBuffer = Buffer.from(purchase.consignment_file, 'base64');
      const filename = `lightcat_${invoiceId}_consignment.rgb`;

      // Set headers for file download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', consignmentBuffer.length);

      // Send file
      return res.send(consignmentBuffer);

    } catch (error) {
      logger.error('Failed to download consignment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to download consignment file'
      });
    }
  }

  /**
   * Get current sale statistics
   */
  async getStats(req, res) {
    try {
      const stats = await req.databaseService.getSalesStats();
      const totalBatches = 27900; // 93% of 21M tokens (19,530,000 ÷ 700 per batch)
      
      const responseStats = {
        success: true,
        stats: {
          batchesSold: stats.batches_sold || 0,
          batchesRemaining: totalBatches - (stats.batches_sold || 0),
          tokensSold: (stats.batches_sold || 0) * 700,
          uniqueBuyers: stats.unique_buyers || 0,
          currentBatchPrice: 2000,
          lastSaleTime: stats.last_sale_time,
          percentSold: ((stats.batches_sold || 0) / totalBatches * 100).toFixed(2)
        }
      };

      return res.json(responseStats);

    } catch (error) {
      logger.error('Failed to get stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics'
      });
    }
  }

  /**
   * Admin: manually mark payment as received
   */
  async markPaymentReceived(req, res) {
    try {
      const { invoiceId } = req.params;

      // Find the purchase
      const purchase = await req.databaseService.getPurchase(invoiceId);

      if (!purchase) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }

      if (purchase.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Invoice is already ${purchase.status}`
        });
      }

      // Process the payment
      await this._handlePaymentReceived(req, purchase);

      return res.json({
        success: true,
        message: 'Payment marked as received and RGB consignment generated'
      });

    } catch (error) {
      logger.error('Failed to mark payment received:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process payment'
      });
    }
  }

  // Private helper methods
  async _checkMintStatus(req) {
    const stats = await req.databaseService.getSalesStats();
    const totalBatches = 27900; // 93% of 21M tokens (19,530,000 ÷ 700 per batch)
    const soldBatches = stats.batches_sold || 0;
    
    return {
      isClosed: soldBatches >= totalBatches,
      remainingBatches: totalBatches - soldBatches,
      totalSold: soldBatches
    };
  }

  async _handlePaymentReceived(req, purchase) {
    // Create a new transaction context if not already in one
    const needsTransaction = !req.transactionId;
    
    if (needsTransaction) {
      // Create transaction wrapper
      const transaction = {
        operations: [],
        rollback: async () => {
          // Rollback logic
          for (const op of transaction.operations.reverse()) {
            try {
              await op.rollback();
            } catch (err) {
              logger.error('Rollback failed:', err);
            }
          }
        }
      };
      
      req.localTransaction = transaction;
    }
    
    try {
      // Update status to paid
      await req.databaseService.updatePurchase(purchase.invoice_id, {
        status: 'paid',
        paid_at: new Date().toISOString()
      });

      // Generate RGB consignment using enhanced service for proper token tracking
      const consignment = await enhancedRgbService.generateConsignment({
        rgbInvoice: purchase.rgb_invoice,
        batchCount: purchase.batch_count,
        invoiceId: purchase.invoice_id,
        walletAddress: purchase.wallet_address
      });

      // Update with consignment
      await req.databaseService.updatePurchase(purchase.invoice_id, {
        status: 'delivered',
        consignment_file: consignment,
        delivered_at: new Date().toISOString()
      });

      // Update sales statistics
      await this._updateSalesStats(req, purchase);

      // Send confirmation email with consignment attachment
      if (purchase.email) {
        await emailService.sendPaymentConfirmed(purchase.email, {
          invoiceId: purchase.invoice_id,
          amount: purchase.token_amount,
          downloadUrl: `/api/rgb/download/${purchase.invoice_id}`,
          consignment: consignment
        });
      }

      logger.info('Payment processed successfully', {
        invoiceId: purchase.invoice_id,
        amount: purchase.amount_sats
      });

    } catch (error) {
      logger.error('Failed to handle payment:', error);
      
      // Rollback local transaction if created
      if (needsTransaction && req.localTransaction) {
        await req.localTransaction.rollback();
      }
      
      throw error;
    }
  }

  async _updateSalesStats(req, purchase) {
    const current = await req.databaseService.getSalesStats();
    
    const updates = {
      batches_sold: (current.batches_sold || 0) + purchase.batch_count,
      unique_buyers: current.unique_buyers || 0, // This would need proper counting
      total_revenue_sats: (current.total_revenue_sats || 0) + purchase.amount_sats,
      last_sale_time: new Date().toISOString()
    };

    await req.databaseService.updateSalesStats(updates);
  }
  
  /**
   * Get purchase history for a wallet address
   */
  async getPurchaseHistory(req, res) {
    try {
      const { address } = req.query;
      
      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      // Get all purchases for this address
      const purchases = await req.databaseService.getPurchasesByWallet(address);
      
      // Sort by date (newest first)
      purchases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return res.json({
        success: true,
        address,
        purchases,
        summary: {
          totalPurchases: purchases.length,
          totalBatches: purchases.reduce((sum, p) => sum + p.batch_count, 0),
          totalTokens: purchases.reduce((sum, p) => sum + p.token_amount, 0),
          totalSpent: purchases.reduce((sum, p) => sum + p.amount_sats, 0)
        }
      });
      
    } catch (error) {
      logger.error('Failed to get purchase history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve purchase history'
      });
    }
  }
}

module.exports = new RGBPaymentController();