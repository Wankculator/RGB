const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');
const { logger } = require('../utils/logger');
const lightningService = require('../services/lightningService');
const rgbService = require('../services/rgbService');
const emailService = require('../services/emailService');

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
      const { 
        email,
        rgbInvoice,
        batchCount = 1
      } = req.body;

      // Validate input
      if (!rgbInvoice) {
        return res.status(400).json({
          success: false,
          error: 'RGB invoice is required'
        });
      }

      // Validate RGB invoice format (basic check)
      if (!rgbInvoice.startsWith('rgb:') && !rgbInvoice.includes('utxob:')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid RGB invoice format'
        });
      }

      // Check if mint is closed
      const { data: salesData } = await supabase
        .from('rgb_sales_stats')
        .select('mint_closed, total_batches_sold')
        .single();
      
      if (salesData?.mint_closed) {
        return res.status(400).json({
          success: false,
          error: 'MINT CLOSED - No new purchases allowed',
          mintClosed: true
        });
      }

      // Check available supply
      const totalSold = salesData?.total_batches_sold || 0;
      const publicBatches = config.tokenSale.totalBatches;
      
      if (totalSold + batchCount > publicBatches) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient supply',
          available: publicBatches - totalSold,
          requested: batchCount
        });
      }

      // Calculate amounts
      const pricePerBatch = config.tokenSale.pricePerBatchBTC;
      const amountBTC = batchCount * pricePerBatch;
      const amountSats = Math.round(amountBTC * 100000000);
      const tokenAmount = batchCount * config.tokenSale.tokensPerBatch;

      // Create or get user
      let userId = null;
      if (email) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .upsert({ email }, { onConflict: 'email' })
          .select()
          .single();
        
        if (!userError && user) {
          userId = user.id;
        }
      }

      // Generate Lightning invoice
      const lightningInvoice = await lightningService.createInvoice({
        amount: amountSats,
        memo: `LIGHTCAT Token Purchase - ${batchCount} batches (${tokenAmount} tokens)`,
        expiry: 1800 // 30 minutes
      });

      if (!lightningInvoice || !lightningInvoice.payment_request) {
        throw new Error('Failed to generate Lightning invoice');
      }

      // Store in database
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('rgb_invoices')
        .insert({
          user_id: userId,
          rgb_invoice: rgbInvoice,
          lightning_invoice: lightningInvoice.payment_request,
          payment_hash: lightningInvoice.payment_hash,
          token_amount: tokenAmount,
          batches: batchCount,
          btc_amount: amountSats,
          price_per_batch: Math.round(pricePerBatch * 100000000),
          expires_at: expiresAt,
          metadata: {
            email: email,
            user_agent: req.headers['user-agent'],
            ip: req.ip
          }
        })
        .select()
        .single();

      if (invoiceError) {
        logger.error('Failed to create invoice record:', invoiceError);
        throw new Error('Failed to create invoice');
      }

      // Also create payment tracking record
      await supabase
        .from('rgb_payments')
        .insert({
          invoice_id: invoice.id,
          payment_hash: lightningInvoice.payment_hash,
          status: 'pending'
        });

      // Log audit event
      await this.logAudit('invoice_created', 'rgb_invoice', invoice.id, userId, req);

      // Start monitoring for payment
      this.monitorPayment(invoice.id, lightningInvoice.payment_hash);

      // Return invoice details
      res.json({
        success: true,
        invoice: {
          id: invoice.id,
          lightningInvoice: lightningInvoice.payment_request,
          paymentHash: lightningInvoice.payment_hash,
          amountSats: amountSats,
          amountBTC: amountBTC,
          batches: batchCount,
          tokens: tokenAmount,
          expiresAt: expiresAt
        }
      });

    } catch (error) {
      logger.error('Error creating RGB invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create invoice'
      });
    }
  }

  /**
   * Check payment status and deliver consignment if paid
   */
  async checkPaymentStatus(req, res) {
    try {
      const { invoiceId } = req.params;

      // Get invoice
      const { data: invoice, error } = await supabase
        .from('rgb_invoices')
        .select('*, rgb_payments(*), rgb_consignments(*)')
        .eq('id', invoiceId)
        .single();

      if (error || !invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }

      // Check if expired
      if (new Date() > new Date(invoice.expires_at) && invoice.status === 'pending') {
        await supabase
          .from('rgb_invoices')
          .update({ status: 'expired' })
          .eq('id', invoiceId);
        
        return res.json({
          success: true,
          status: 'expired',
          paid: false
        });
      }

      // Get payment info from Lightning node
      const payment = invoice.rgb_payments[0];
      if (payment && payment.status === 'confirmed') {
        // Check if consignment is ready
        const consignment = invoice.rgb_consignments[0];
        
        return res.json({
          success: true,
          status: 'paid',
          paid: true,
          consignment: {
            ready: consignment?.status === 'generated',
            delivered: consignment?.status === 'delivered',
            downloadUrl: consignment?.status === 'generated' ? `/api/rgb/download/${invoiceId}` : null
          }
        });
      }

      // Still pending
      res.json({
        success: true,
        status: invoice.status,
        paid: false
      });

    } catch (error) {
      logger.error('Error checking payment status:', error);
      res.status(500).json({
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

      // Get consignment record
      const { data: consignment, error } = await supabase
        .from('rgb_consignments')
        .select('*, rgb_invoices!inner(user_id, status)')
        .eq('invoice_id', invoiceId)
        .eq('status', 'generated')
        .single();

      if (error || !consignment) {
        return res.status(404).json({
          success: false,
          error: 'Consignment not found or not ready'
        });
      }

      // Get actual consignment data from RGB service
      const consignmentData = await rgbService.getConsignment(consignment.transfer_id);

      if (!consignmentData) {
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve consignment'
        });
      }

      // Update download count and delivery status
      await supabase
        .from('rgb_consignments')
        .update({
          download_count: consignment.download_count + 1,
          delivered_at: consignment.delivered_at || new Date(),
          status: 'delivered'
        })
        .eq('id', consignment.id);

      // Update invoice status
      await supabase
        .from('rgb_invoices')
        .update({ status: 'delivered' })
        .eq('id', invoiceId);

      // Set headers for file download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="lightcat_${invoiceId}.rgb"`);
      res.setHeader('X-Consignment-Hash', consignment.consignment_hash);

      // Send consignment data
      res.send(consignmentData);

    } catch (error) {
      logger.error('Error downloading consignment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download consignment'
      });
    }
  }

  /**
   * Monitor Lightning payment and create consignment when paid
   */
  async monitorPayment(invoiceId, paymentHash) {
    try {
      // Set up payment monitoring
      const checkPayment = async () => {
        const paymentInfo = await lightningService.lookupInvoice(paymentHash);
        
        if (paymentInfo && paymentInfo.settled) {
          // Payment confirmed!
          logger.info(`Payment confirmed for invoice ${invoiceId}`);
          
          // Update payment record
          await supabase
            .from('rgb_payments')
            .update({
              status: 'confirmed',
              settled_at: new Date(),
              payment_preimage: paymentInfo.r_preimage,
              amount_paid: paymentInfo.amt_paid_sat,
              fee_paid: paymentInfo.fee_paid_sat || 0
            })
            .eq('invoice_id', invoiceId);

          // Update invoice status
          await supabase
            .from('rgb_invoices')
            .update({ status: 'paid' })
            .eq('id', invoiceId);

          // Create RGB consignment
          await this.createConsignment(invoiceId);

          // Clear interval
          clearInterval(paymentCheckInterval);
        }
      };

      // Check every 5 seconds for 30 minutes
      const paymentCheckInterval = setInterval(checkPayment, 5000);
      
      // Stop checking after 30 minutes
      setTimeout(() => {
        clearInterval(paymentCheckInterval);
      }, 30 * 60 * 1000);

      // Initial check
      checkPayment();

    } catch (error) {
      logger.error('Error monitoring payment:', error);
    }
  }

  /**
   * Create RGB consignment for paid invoice
   */
  async createConsignment(invoiceId) {
    try {
      // Get invoice details
      const { data: invoice } = await supabase
        .from('rgb_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Create RGB transfer
      const transfer = await rgbService.createTransfer({
        invoice: invoice.rgb_invoice,
        amount: invoice.token_amount,
        assetId: config.rgb.assetId
      });

      if (!transfer || !transfer.consignment) {
        throw new Error('Failed to create RGB transfer');
      }

      // Calculate consignment hash
      const consignmentHash = crypto
        .createHash('sha256')
        .update(transfer.consignment)
        .digest('hex');

      // Store consignment record
      const { error } = await supabase
        .from('rgb_consignments')
        .insert({
          invoice_id: invoiceId,
          consignment_hash: consignmentHash,
          consignment_size: transfer.consignment.length,
          transfer_id: transfer.transferId,
          delivery_method: invoice.user_id ? 'download' : 'api',
          download_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          status: 'generated',
          metadata: {
            psbt: transfer.psbt,
            disclosure: transfer.disclosure
          }
        });

      if (error) {
        throw error;
      }

      // Update sales statistics
      await this.updateSalesStats(invoice);

      // Send notification email if user provided email
      if (invoice.metadata?.email) {
        await emailService.sendConsignmentReady({
          email: invoice.metadata.email,
          invoiceId: invoiceId,
          tokenAmount: invoice.token_amount,
          downloadUrl: `${config.server.clientUrl}/download/${invoiceId}`
        });
      }

      logger.info(`Consignment created for invoice ${invoiceId}`);

    } catch (error) {
      logger.error('Error creating consignment:', error);
      
      // Mark invoice as failed
      await supabase
        .from('rgb_invoices')
        .update({ status: 'failed' })
        .eq('id', invoiceId);
    }
  }

  /**
   * Update sales statistics
   */
  async updateSalesStats(invoice) {
    try {
      const { data: currentStats } = await supabase
        .from('rgb_sales_stats')
        .select('*')
        .eq('id', 1)
        .single();

      const updates = {
        total_batches_sold: (currentStats?.total_batches_sold || 0) + invoice.batches,
        total_tokens_sold: (currentStats?.total_tokens_sold || 0) + invoice.token_amount,
        total_btc_raised: (currentStats?.total_btc_raised || 0) + (invoice.btc_amount / 100000000),
        total_consignments_delivered: (currentStats?.total_consignments_delivered || 0) + 1,
        last_sale_at: new Date()
      };

      await supabase
        .from('rgb_sales_stats')
        .update(updates)
        .eq('id', 1);

      // Update unique buyers count if new user
      if (invoice.user_id) {
        const { count } = await supabase
          .from('rgb_invoices')
          .select('*', { count: 'exact' })
          .eq('user_id', invoice.user_id)
          .eq('status', 'delivered');
        
        if (count === 1) {
          await supabase
            .from('rgb_sales_stats')
            .update({ unique_buyers: (currentStats?.unique_buyers || 0) + 1 })
            .eq('id', 1);
        }
      }

    } catch (error) {
      logger.error('Error updating sales stats:', error);
    }
  }

  /**
   * Get current sales statistics
   */
  async getStats(req, res) {
    try {
      const { data: stats, error } = await supabase
        .from('rgb_sales_stats')
        .select('*')
        .eq('id', 1)
        .single();

      if (error || !stats) {
        return res.json({
          success: true,
          stats: {
            totalBatchesSold: 0,
            totalTokensSold: 0,
            percentageSold: 0,
            totalBtcRaised: 0,
            uniqueBuyers: 0,
            consignmentsDelivered: 0
          }
        });
      }

      const totalBatches = config.tokenSale.totalBatches;
      const percentageSold = (stats.total_batches_sold / totalBatches) * 100;

      res.json({
        success: true,
        stats: {
          totalBatchesSold: stats.total_batches_sold,
          totalTokensSold: stats.total_tokens_sold,
          percentageSold: percentageSold.toFixed(2),
          totalBtcRaised: stats.total_btc_raised,
          uniqueBuyers: stats.unique_buyers,
          consignmentsDelivered: stats.total_consignments_delivered,
          averageDeliveryTime: stats.average_delivery_time_seconds
        }
      });

    } catch (error) {
      logger.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  }

  /**
   * Log audit event
   */
  async logAudit(action, entityType, entityId, userId, req) {
    try {
      await supabase
        .from('rgb_audit_log')
        .insert({
          action,
          entity_type: entityType,
          entity_id: entityId,
          user_id: userId,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
    } catch (error) {
      logger.error('Error logging audit:', error);
    }
  }
}

module.exports = new RGBPaymentController();