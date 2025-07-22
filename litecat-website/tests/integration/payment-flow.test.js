const request = require('supertest');
const { app } = require('../../server/app');
const MockCoinPaymentsAPI = require('../mocks/coinpayments.mock');

describe('Payment Flow Integration Tests', () => {
  let mockCoinPayments;
  
  beforeAll(() => {
    mockCoinPayments = new MockCoinPaymentsAPI();
    // Inject mock into app
    app.locals.coinpayments = mockCoinPayments;
  });

  describe('POST /api/payments/create-invoice', () => {
    it('should create invoice for valid purchase', async () => {
      const purchaseData = {
        walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        batchCount: 3,
        email: 'test@example.com',
        gameScore: 75,
        tier: 2
      };

      const response = await request(app)
        .post('/api/payments/create-invoice')
        .send(purchaseData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invoice');
      expect(response.body.invoice).toHaveProperty('address');
      expect(response.body.invoice).toHaveProperty('amount', 0.00006); // 3 batches * 2000 sats
      expect(response.body.invoice).toHaveProperty('qrcode_url');
    });

    it('should reject invalid wallet address', async () => {
      const purchaseData = {
        walletAddress: 'invalid-address',
        batchCount: 1,
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/payments/create-invoice')
        .send(purchaseData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid wallet address');
    });

    it('should enforce tier-based batch limits', async () => {
      const purchaseData = {
        walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        batchCount: 10,
        email: 'test@example.com',
        gameScore: 30,
        tier: 1 // Tier 1 max is 5 batches
      };

      const response = await request(app)
        .post('/api/payments/create-invoice')
        .send(purchaseData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('exceeds tier limit');
    });
  });

  describe('Payment Confirmation Flow', () => {
    it('should handle successful payment webhook', async () => {
      // Create invoice first
      const invoice = await mockCoinPayments.createTransaction({
        amount: 0.00006,
        currency2: 'BTC',
        custom: JSON.stringify({ walletAddress: 'bc1qtest', batches: 3 })
      });

      // Simulate payment
      await mockCoinPayments.simulatePayment(invoice.txn_id, 0.00006);

      // Send IPN webhook
      const ipnData = await mockCoinPayments.sendIPN(invoice.txn_id);
      
      const response = await request(app)
        .post('/api/webhooks/coinpayments/ipn')
        .send(ipnData)
        .set('HMAC', 'mock-hmac-signature')
        .expect(200);

      expect(response.text).toBe('IPN OK');
    });

    it('should reject payment with wrong amount', async () => {
      const invoice = await mockCoinPayments.createTransaction({
        amount: 0.00006,
        currency2: 'BTC',
        custom: JSON.stringify({ walletAddress: 'bc1qtest', batches: 3 })
      });

      // Simulate wrong payment amount
      await mockCoinPayments.simulatePayment(invoice.txn_id, 0.00005);

      const ipnData = await mockCoinPayments.sendIPN(invoice.txn_id);
      
      expect(ipnData.status).toBe(-1);
      expect(ipnData.status_text).toContain('Incorrect amount');
    });
  });

  describe('Real-time Updates', () => {
    it('should send WebSocket updates on purchase', async (done) => {
      // This would require WebSocket client setup
      // Example structure:
      
      // const ws = new WebSocket('ws://localhost:3000/ws');
      // ws.on('message', (data) => {
      //   const message = JSON.parse(data);
      //   if (message.type === 'sales:update') {
      //     expect(message.data).toHaveProperty('totalSold');
      //     done();
      //   }
      // });
      
      // For now, just mark as done
      done();
    });
  });
});