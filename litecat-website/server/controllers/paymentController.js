const crypto = require('crypto');
const QRCode = require('qrcode');
const { supabase } = require('../services/supabaseService');
const coinpaymentsService = require('../services/coinpaymentsService');
const rgbService = require('../services/rgbService');
const emailService = require('../services/emailService');
const { logger } = require('../utils/logger');
const config = require('../../config');

class PaymentController {
  /**
   * Create a new payment invoice
   */
  async createInvoice(req, res) {
    try {
      const { walletAddress, batchCount, gameTier = 1 } = req.body;
      
      // Check if mint is closed
      const { data: salesData } = await supabase
        .from('sales_stats')
        .select('mint_closed, total_sold')
        .single();
      
      if (salesData?.mint_closed) {
        return res.status(400).json({
          error: 'MINT CLOSED - No new purchases allowed',
          mintClosed: true
        });
      }
      
      // Validate game tier and batch count
      const maxBatches = config.game.tiers[gameTier]?.maxBatches || 5;
      if (batchCount > maxBatches) {
        return res.status(400).json({
          error: 'Batch count exceeds tier limit',
          maxBatches,
          currentTier: gameTier
        });
      }

      // Check if wallet has reached purchase limit
      const { data: existingPurchases } = await supabase
        .from('purchases')
        .select('batch_count')
        .eq('wallet_address', walletAddress)
        .eq('status', 'completed');

      const totalBatches = existingPurchases?.reduce((sum, purchase) => sum + purchase.batch_count, 0) || 0;
      
      if (totalBatches + batchCount > maxBatches) {
        return res.status(400).json({
          error: 'Purchase would exceed wallet limit',
          currentBatches: totalBatches,
          requestedBatches: batchCount,
          maxBatches
        });
      }

      // Check available supply
      const { data: salesData } = await supabase
        .from('sales_stats')
        .select('total_sold')
        .single();

      const totalSold = salesData?.total_sold || 0;
      if (totalSold + batchCount > config.token.availableBatches) {
        return res.status(400).json({
          error: 'Insufficient supply',
          available: config.token.availableBatches - totalSold,
          requested: batchCount
        });
      }

      // Calculate payment amount with unique identifier
      const baseSatoshis = batchCount * config.token.satoshisPerBatch;
      
      // Add tiny unique amount (1-9999 satoshis) based on timestamp
      const uniqueId = parseInt(Date.now().toString().slice(-4));
      const totalSatoshis = baseSatoshis + uniqueId;
      
      const totalTokens = batchCount * config.token.tokensPerBatch;

      // Generate unique invoice ID
      const invoiceId = crypto.randomUUID();
      
      let paymentAddress, qrCodeDataURL, coinpaymentsId = null;
      
      // Check if CoinPayments is configured
      if (config.payments.coinpayments.publicKey !== 'not-configured' && 
          config.payments.coinpayments.privateKey !== 'not-configured') {
        // Create invoice with CoinPayments
        const coinpaymentsInvoice = await coinpaymentsService.createInvoice({
          amount: totalSatoshis / 100000000, // Convert to BTC
          currency: 'BTC',
          buyer_email: `${walletAddress}@litecat.temp`,
          item_name: `Litecat Tokens - ${batchCount} batches`,
          invoice: invoiceId,
          custom: JSON.stringify({
            walletAddress,
            batchCount,
            gameTier,
            totalTokens
          })
        });
        
        paymentAddress = coinpaymentsInvoice.address;
        coinpaymentsId = coinpaymentsInvoice.txn_id;
      } else {
        // Use configured BTC wallet address
        paymentAddress = config.bitcoin.walletAddress;
        logger.info('Using direct BTC wallet address (CoinPayments not configured)');
      }

      // Generate QR code
      const bitcoinUri = `bitcoin:${paymentAddress}?amount=${totalSatoshis / 100000000}&label=Litecat%20Token%20Purchase`;
      qrCodeDataURL = await QRCode.toDataURL(bitcoinUri);

      // Store in database using new schema
      const { data: purchase, error } = await supabase
        .from('purchases')
        .insert({
          invoice_id: invoiceId,
          wallet_address: walletAddress,
          payment_address: paymentAddress,
          amount_btc: totalSatoshis / 100000000,
          tokens: totalTokens,
          batches: batchCount,
          tier: `tier${gameTier}`,
          status: 'pending',
          coinpayments_txn_id: coinpaymentsId,
          expires_at: new Date(Date.now() + 3600000), // 1 hour
          metadata: {
            gameTier: gameTier,
            userAgent: req.headers['user-agent'],
            ip: req.ip
          }
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create purchase record:', error);
        return res.status(500).json({ error: 'Failed to create invoice' });
      }

      // Send response
      res.status(201).json({
        invoiceId: purchase.invoice_id,
        paymentAddress: paymentAddress,
        amount: totalSatoshis,
        amountBTC: totalSatoshis / 100000000,
        batchCount,
        totalTokens,
        qrCode: qrCodeDataURL,
        expiresAt: purchase.expires_at,
        status: 'pending'
      });

      logger.info(`Invoice created: ${invoiceId} for ${walletAddress} - ${batchCount} batches`);

    } catch (error) {
      logger.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get invoice details
   */
  async getInvoice(req, res) {
    try {
      const { invoiceId } = req.params;

      const { data: purchase, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error || !purchase) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Check if expired
      if (new Date() > new Date(purchase.expires_at) && purchase.status === 'pending') {
        await supabase
          .from('purchases')
          .update({ status: 'expired' })
          .eq('id', invoiceId);
        
        purchase.status = 'expired';
      }

      res.json({
        invoiceId: purchase.id,
        walletAddress: purchase.wallet_address,
        batchCount: purchase.batch_count,
        totalTokens: purchase.total_tokens,
        totalSatoshis: purchase.total_satoshis,
        paymentAddress: purchase.payment_address,
        status: purchase.status,
        expiresAt: purchase.expires_at,
        createdAt: purchase.created_at
      });

    } catch (error) {
      logger.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(req, res) {
    try {
      const { invoiceId } = req.params;

      // Get purchase record
      const { data: purchase, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error || !purchase) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (purchase.status !== 'pending') {
        return res.json({ status: purchase.status });
      }

      // Check payment with CoinPayments
      const paymentStatus = await coinpaymentsService.getTransactionInfo(purchase.coinpayments_id);

      let newStatus = purchase.status;
      
      if (paymentStatus.status >= 100) {
        // Payment confirmed
        newStatus = 'completed';
        
        // Update database
        await supabase
          .from('purchases')
          .update({ 
            status: 'completed',
            completed_at: new Date(),
            transaction_hash: paymentStatus.payment_address
          })
          .eq('id', invoiceId);

        // Initiate RGB token distribution
        try {
          await rgbService.queueTokenDistribution(purchase);
          logger.info(`Token distribution queued for invoice ${invoiceId}`);
        } catch (rgbError) {
          logger.error('RGB distribution failed:', rgbError);
        }

        // Send confirmation email
        try {
          await emailService.sendPurchaseConfirmation(purchase);
        } catch (emailError) {
          logger.error('Failed to send confirmation email:', emailError);
        }

        logger.info(`Payment completed for invoice ${invoiceId}`);
        
      } else if (paymentStatus.status < 0) {
        // Payment failed
        newStatus = 'failed';
        
        await supabase
          .from('purchases')
          .update({ status: 'failed' })
          .eq('id', invoiceId);
      }

      res.json({ status: newStatus });

    } catch (error) {
      logger.error('Error verifying payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get payment history for a wallet
   */
  async getPaymentHistory(req, res) {
    try {
      const { walletAddress } = req.params;

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching payment history:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      res.json({
        walletAddress,
        purchases: purchases || [],
        totalBatches: purchases?.reduce((sum, p) => p.status === 'completed' ? sum + p.batch_count : sum, 0) || 0,
        totalTokens: purchases?.reduce((sum, p) => p.status === 'completed' ? sum + p.total_tokens : sum, 0) || 0
      });

    } catch (error) {
      logger.error('Error fetching payment history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get sales statistics
   */
  async getSalesStats(req, res) {
    try {
      // Get sales stats from dedicated table
      const { data: salesStats, error: statsError } = await supabase
        .from('sales_stats')
        .select('*')
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        logger.error('Error fetching sales stats:', statsError);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // If no stats exist, return defaults
      const stats = salesStats || {
        total_batches_sold: 0,
        total_tokens_sold: 0,
        total_btc_raised: 0,
        unique_buyers: 0
      };

      const totalBatches = config.tokenSale.totalBatches || 28500;
      const batchesSold = stats.total_batches_sold || 0;
      const percentageSold = (batchesSold / totalBatches) * 100;

      res.json({
        totalBatches: totalBatches,
        batchesSold: batchesSold,
        batchesRemaining: totalBatches - batchesSold,
        tokensSold: stats.total_tokens_sold || 0,
        salesProgress: percentageSold.toFixed(2),
        totalBtcRaised: stats.total_btc_raised || 0,
        uniqueBuyers: stats.unique_buyers || 0,
        isSoldOut: batchesSold >= totalBatches
      });

    } catch (error) {
      logger.error('Error fetching sales stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Process refund (admin only)
   */
  async processRefund(req, res) {
    try {
      const { invoiceId } = req.params;
      const { reason } = req.body;

      // Get purchase record
      const { data: purchase, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error || !purchase) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (purchase.status !== 'completed') {
        return res.status(400).json({ error: 'Can only refund completed purchases' });
      }

      // Process refund through CoinPayments
      const refundResult = await coinpaymentsService.createWithdrawal({
        amount: purchase.total_satoshis / 100000000,
        currency: 'BTC',
        address: purchase.wallet_address,
        note: `Refund for invoice ${invoiceId}: ${reason}`
      });

      // Update purchase status
      await supabase
        .from('purchases')
        .update({ 
          status: 'refunded',
          refund_reason: reason,
          refunded_at: new Date()
        })
        .eq('id', invoiceId);

      res.json({
        success: true,
        message: 'Refund processed successfully',
        refundId: refundResult.id
      });

      logger.info(`Refund processed for invoice ${invoiceId}: ${reason}`);

    } catch (error) {
      logger.error('Error processing refund:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new PaymentController();
