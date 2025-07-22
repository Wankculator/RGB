const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const supabaseService = require('../services/supabaseService');
const rgbService = require('../services/rgbService');
const emailService = require('../services/emailService');

// CoinPayments IPN webhook handler
router.post('/coinpayments/ipn', async (req, res) => {
  try {
    const { 
      txn_id, 
      status, 
      status_text, 
      amount1, 
      amount2, 
      currency1, 
      currency2,
      custom,
      ipn_mode,
      merchant
    } = req.body;

    // Verify HMAC signature
    const hmac = req.get('HMAC');
    const paramString = new URLSearchParams(req.body).toString();
    const calcHmac = crypto
      .createHmac('sha512', process.env.COINPAYMENTS_IPN_SECRET)
      .update(paramString)
      .digest('hex');

    if (hmac !== calcHmac) {
      logger.error('Invalid IPN HMAC signature', { txn_id, hmac, calcHmac });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Verify merchant ID
    if (merchant !== process.env.COINPAYMENTS_MERCHANT_ID) {
      logger.error('Invalid merchant ID', { txn_id, merchant });
      return res.status(401).json({ error: 'Invalid merchant' });
    }

    // Parse custom data
    let purchaseData;
    try {
      purchaseData = JSON.parse(custom);
    } catch (e) {
      logger.error('Failed to parse custom data', { txn_id, custom });
      return res.status(400).json({ error: 'Invalid custom data' });
    }

    // Update purchase status in database
    const purchase = await supabaseService.updatePurchaseStatus({
      transactionId: txn_id,
      status: mapCoinPaymentsStatus(status),
      statusText: status_text,
      amount: amount2,
      currency: currency2,
      rawStatus: status
    });

    // Handle different payment statuses
    switch (parseInt(status)) {
      case 100: // Payment complete
      case 2: // Payment complete (alternative)
        await handleSuccessfulPayment(purchase, purchaseData);
        break;
      
      case -1: // Payment cancelled/timed out
        await handleCancelledPayment(purchase, purchaseData);
        break;
      
      case 0: // Waiting for payment
      case 1: // Payment confirmed, waiting for confirmations
        // Just update status, no action needed
        logger.info('Payment pending', { txn_id, status, status_text });
        break;
      
      default:
        if (status < 0) {
          await handleFailedPayment(purchase, purchaseData, status_text);
        }
    }

    res.status(200).send('IPN OK');
  } catch (error) {
    logger.error('IPN processing error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check webhook for monitoring
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'webhooks',
    timestamp: new Date().toISOString() 
  });
});

// Helper functions
function mapCoinPaymentsStatus(status) {
  const statusNum = parseInt(status);
  if (statusNum >= 100 || statusNum === 2) return 'completed';
  if (statusNum >= 0) return 'pending';
  return 'failed';
}

async function handleSuccessfulPayment(purchase, purchaseData) {
  try {
    // Send confirmation email
    await emailService.sendPurchaseConfirmation({
      email: purchase.email,
      walletAddress: purchase.wallet_address,
      batches: purchase.batch_count,
      transactionId: purchase.transaction_id,
      amount: purchase.amount
    });

    // Queue RGB token distribution
    await rgbService.queueTokenDistribution({
      purchaseId: purchase.id,
      walletAddress: purchase.wallet_address,
      tokenAmount: purchase.batch_count * 700,
      transactionHash: purchase.bitcoin_txid
    });

    // Update sales statistics
    await supabaseService.updateSalesStats({
      batchesSold: purchase.batch_count,
      totalRevenue: purchase.amount
    });

    logger.info('Payment processed successfully', { 
      purchaseId: purchase.id,
      walletAddress: purchase.wallet_address,
      batches: purchase.batch_count
    });
  } catch (error) {
    logger.error('Error handling successful payment', error);
    throw error;
  }
}

async function handleCancelledPayment(purchase, purchaseData) {
  // Send cancellation email
  await emailService.sendPaymentCancelled({
    email: purchase.email,
    transactionId: purchase.transaction_id
  });

  logger.info('Payment cancelled', { 
    purchaseId: purchase.id,
    transactionId: purchase.transaction_id
  });
}

async function handleFailedPayment(purchase, purchaseData, reason) {
  // Send failure email
  await emailService.sendPaymentFailed({
    email: purchase.email,
    transactionId: purchase.transaction_id,
    reason
  });

  logger.info('Payment failed', { 
    purchaseId: purchase.id,
    transactionId: purchase.transaction_id,
    reason
  });
}

module.exports = router;