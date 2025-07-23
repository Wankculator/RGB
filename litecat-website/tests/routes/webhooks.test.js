const request = require('supertest');
const app = require('../../server/app');
const crypto = require('crypto');

describe('Webhook Routes', () => {
  describe('POST /api/webhooks/coinpayments', () => {
    test('should verify webhook signature', async () => {
      const payload = {
        txn_id: 'test-123',
        status: 100,
        amount: 10000
      };
      
      // In real implementation, sign with IPN secret
      const response = await request(app)
        .post('/api/webhooks/coinpayments')
        .send(payload)
        .set('X-CoinPayments-Signature', 'invalid-signature')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Invalid signature');
    });

    test('should require signature header', async () => {
      const response = await request(app)
        .post('/api/webhooks/coinpayments')
        .send({ txn_id: 'test' })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/webhooks/lightning', () => {
    test('should process lightning payment webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/lightning')
        .send({
          invoice: 'lnbc...',
          status: 'paid',
          amount: 2000,
          paymentHash: 'hash123'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });

    test('should validate webhook payload', async () => {
      const response = await request(app)
        .post('/api/webhooks/lightning')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Webhook Security', () => {
    test('should rate limit webhook endpoints', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .post('/api/webhooks/lightning')
            .send({ test: i })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});