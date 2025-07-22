const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validatePaymentRequest, validateWalletAddress } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/payments/create-invoice
 * @desc    Create a new payment invoice
 * @access  Public
 */
router.post('/create-invoice', 
  validateWalletAddress,
  validatePaymentRequest,
  paymentController.createInvoice
);

/**
 * @route   GET /api/payments/invoice/:invoiceId
 * @desc    Get invoice details
 * @access  Public
 */
router.get('/invoice/:invoiceId', paymentController.getInvoice);

/**
 * @route   POST /api/payments/verify/:invoiceId
 * @desc    Verify payment status
 * @access  Public
 */
router.post('/verify/:invoiceId', paymentController.verifyPayment);

/**
 * @route   GET /api/payments/history/:walletAddress
 * @desc    Get payment history for a wallet
 * @access  Public
 */
router.get('/history/:walletAddress', paymentController.getPaymentHistory);

/**
 * @route   GET /api/payments/stats
 * @desc    Get sales statistics
 * @access  Public
 */
router.get('/stats', paymentController.getSalesStats);

/**
 * @route   POST /api/payments/refund/:invoiceId
 * @desc    Process refund (admin only)
 * @access  Private
 */
router.post('/refund/:invoiceId', 
  authenticate,
  paymentController.processRefund
);

module.exports = router;
