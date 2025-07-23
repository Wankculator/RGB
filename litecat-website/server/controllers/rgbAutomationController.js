// RGB Automation Controller - Handles automated token distribution
const rgbNodeService = require('../services/rgbNodeService');
const rgbService = require('../services/rgbServiceV2');
const lightningService = require('../services/lightningService');
const supabase = require('../config/supabase');
const { logger } = require('../utils/logger');

class RGBAutomationController {
  constructor() {
    this.processingQueue = new Map();
    this.isProcessing = false;
  }

  /**
   * Process paid invoice and distribute tokens
   */
  async processPaidInvoice(invoiceId) {
    try {
      logger.info('Processing paid invoice for token distribution', { invoiceId });

      // Get invoice details from database
      const { data: invoice, error } = await supabase
        .from('rgb_purchases')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single();

      if (error || !invoice) {
        throw new Error('Invoice not found');
      }

      // Check if already processed
      if (invoice.status === 'delivered') {
        logger.info('Invoice already processed', { invoiceId });
        return { success: true, message: 'Already delivered' };
      }

      // Validate RGB invoice format
      const validation = rgbNodeService.validateInvoice(invoice.rgb_invoice);
      if (!validation.valid) {
        throw new Error(`Invalid RGB invoice: ${validation.error}`);
      }

      // Calculate token amount
      const tokenAmount = invoice.batch_count * 700; // 700 tokens per batch

      // Execute transfer using RGB node
      logger.info('Executing token transfer', { 
        invoiceId, 
        tokenAmount,
        recipientType: validation.type 
      });

      const transferResult = await rgbNodeService.transferTokens(
        invoice.rgb_invoice,
        tokenAmount,
        {
          invoiceId: invoice.invoice_id,
          batchCount: invoice.batch_count,
          purchaseDate: invoice.created_at,
          email: invoice.email
        }
      );

      // Update database with transfer result
      const { error: updateError } = await supabase
        .from('rgb_purchases')
        .update({
          status: 'delivered',
          consignment: transferResult.consignment,
          transfer_id: transferResult.transferId,
          delivered_at: new Date().toISOString(),
          delivery_metadata: {
            tokenAmount,
            transferTimestamp: transferResult.timestamp
          }
        })
        .eq('invoice_id', invoiceId);

      if (updateError) {
        logger.error('Failed to update delivery status', updateError);
        // Don't throw - tokens were delivered successfully
      }

      // Log successful delivery
      logger.info('Tokens delivered successfully', {
        invoiceId,
        transferId: transferResult.transferId,
        tokenAmount
      });

      return {
        success: true,
        transferId: transferResult.transferId,
        consignment: transferResult.consignment,
        tokenAmount
      };

    } catch (error) {
      logger.error('Token distribution failed', {
        invoiceId,
        error: error.message
      });

      // Update status to failed
      await supabase
        .from('rgb_purchases')
        .update({
          status: 'delivery_failed',
          error_message: error.message,
          failed_at: new Date().toISOString()
        })
        .eq('invoice_id', invoiceId);

      throw error;
    }
  }

  /**
   * Check RGB node health and balance
   */
  async getSystemStatus(req, res) {
    try {
      const health = await rgbNodeService.checkHealth();
      
      res.json({
        success: true,
        rgb_node: health,
        automation: {
          enabled: !process.env.USE_MOCK_RGB || process.env.USE_MOCK_RGB === 'false',
          queueSize: this.processingQueue.size,
          isProcessing: this.isProcessing
        }
      });
    } catch (error) {
      logger.error('Failed to get system status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system status'
      });
    }
  }

  /**
   * Get token balance
   */
  async getBalance(req, res) {
    try {
      const balance = await rgbNodeService.getBalance();
      
      res.json({
        success: true,
        balance: balance,
        formatted: balance.toLocaleString() + ' LIGHTCAT'
      });
    } catch (error) {
      logger.error('Failed to get balance', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get balance'
      });
    }
  }

  /**
   * Process pending deliveries (batch)
   */
  async processPendingDeliveries(req, res) {
    try {
      // Get all paid but undelivered invoices
      const { data: pendingInvoices, error } = await supabase
        .from('rgb_purchases')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: true })
        .limit(10); // Process 10 at a time

      if (error) {
        throw error;
      }

      if (!pendingInvoices || pendingInvoices.length === 0) {
        return res.json({
          success: true,
          message: 'No pending deliveries',
          processed: 0
        });
      }

      // Process each invoice
      const results = {
        successful: [],
        failed: []
      };

      for (const invoice of pendingInvoices) {
        try {
          const result = await this.processPaidInvoice(invoice.invoice_id);
          results.successful.push({
            invoiceId: invoice.invoice_id,
            ...result
          });
        } catch (error) {
          results.failed.push({
            invoiceId: invoice.invoice_id,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        processed: pendingInvoices.length,
        successful: results.successful.length,
        failed: results.failed.length,
        results
      });

    } catch (error) {
      logger.error('Failed to process pending deliveries', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process pending deliveries'
      });
    }
  }

  /**
   * Manual token transfer (admin)
   */
  async manualTransfer(req, res) {
    try {
      const { recipientInvoice, amount, reason } = req.body;

      // Validate inputs
      if (!recipientInvoice || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Execute transfer
      const result = await rgbNodeService.transferTokens(
        recipientInvoice,
        amount,
        {
          type: 'manual',
          reason: reason || 'Manual transfer',
          adminUser: req.user?.email || 'system',
          timestamp: new Date().toISOString()
        }
      );

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      logger.error('Manual transfer failed', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get transfer history
   */
  async getTransferHistory(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const history = await rgbNodeService.getTransferHistory(limit);
      
      res.json({
        success: true,
        transfers: history,
        count: history.length
      });
    } catch (error) {
      logger.error('Failed to get transfer history', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transfer history'
      });
    }
  }

  /**
   * Webhook handler for Lightning payment confirmation
   */
  async handlePaymentWebhook(req, res) {
    try {
      const { invoiceId, status, paymentHash } = req.body;

      logger.info('Payment webhook received', { invoiceId, status });

      if (status === 'settled' || status === 'paid') {
        // Queue for processing
        this.processingQueue.set(invoiceId, {
          invoiceId,
          paymentHash,
          timestamp: new Date()
        });

        // Process asynchronously
        setImmediate(() => {
          this.processQueuedDeliveries();
        });
      }

      res.json({ success: true, queued: true });

    } catch (error) {
      logger.error('Webhook processing failed', error);
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  }

  /**
   * Process queued deliveries
   */
  async processQueuedDeliveries() {
    if (this.isProcessing || this.processingQueue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      for (const [invoiceId, data] of this.processingQueue) {
        try {
          await this.processPaidInvoice(invoiceId);
          this.processingQueue.delete(invoiceId);
        } catch (error) {
          logger.error('Failed to process queued delivery', {
            invoiceId,
            error: error.message
          });
          // Keep in queue for retry
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

module.exports = new RGBAutomationController();