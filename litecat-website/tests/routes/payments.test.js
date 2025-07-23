const request = require('supertest');
const app = require('../../server/app');

describe('Payment Routes', () => {
  describe('POST /api/payments/create-invoice', () => {
    test('should create payment invoice', async () => {
      const response = await request(app)
        .post('/api/payments/create-invoice')
        .send({
          amount: 10000,
          currency: 'BTC',
          buyerEmail: 'test@example.com',
          itemDesc: 'LIGHTCAT tokens - 5 batches'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invoiceId');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('amount');
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/payments/create-invoice')
        .send({
          amount: 10000,
          currency: 'BTC',
          buyerEmail: 'invalid-email',
          itemDesc: 'Test'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should require minimum amount', async () => {
      const response = await request(app)
        .post('/api/payments/create-invoice')
        .send({
          amount: 100, // Too small
          currency: 'BTC',
          buyerEmail: 'test@example.com',
          itemDesc: 'Test'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/payments/status/:txId', () => {
    test('should return payment status', async () => {
      const txId = 'test-tx-123';
      
      const response = await request(app)
        .get(`/api/payments/status/${txId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('status');
      expect(['pending', 'confirmed', 'failed']).toContain(response.body.status);
    });
  });
});