const request = require('supertest');
const app = require('../../server/app');

describe('RGB Routes', () => {
  describe('POST /api/rgb/invoice', () => {
    test('should create invoice with valid RGB invoice', async () => {
      const response = await request(app)
        .post('/api/rgb/invoice')
        .send({
          rgbInvoice: 'rgb:utxob:test123',
          batchCount: 1
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invoiceId');
      expect(response.body).toHaveProperty('lightningInvoice');
      expect(response.body).toHaveProperty('amount', 2000);
    });

    test('should reject invalid RGB invoice format', async () => {
      const response = await request(app)
        .post('/api/rgb/invoice')
        .send({
          rgbInvoice: 'invalid-format',
          batchCount: 1
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should enforce rate limiting', async () => {
      // Make 11 requests rapidly (limit is 10 per 5 minutes)
      const promises = [];
      for (let i = 0; i < 11; i++) {
        promises.push(
          request(app)
            .post('/api/rgb/invoice')
            .send({
              rgbInvoice: 'rgb:utxob:test' + i,
              batchCount: 1
            })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/rgb/invoice/:id/status', () => {
    test('should return payment status', async () => {
      // First create an invoice
      const createResponse = await request(app)
        .post('/api/rgb/invoice')
        .send({
          rgbInvoice: 'rgb:utxob:test456',
          batchCount: 1
        });
      
      const invoiceId = createResponse.body.invoiceId;
      
      // Check status
      const statusResponse = await request(app)
        .get(`/api/rgb/invoice/${invoiceId}/status`)
        .expect(200);
      
      expect(statusResponse.body).toHaveProperty('success', true);
      expect(statusResponse.body).toHaveProperty('status');
      expect(['pending', 'paid', 'expired', 'failed', 'delivered']).toContain(statusResponse.body.status);
    });
  });

  describe('GET /api/rgb/stats', () => {
    test('should return current sales statistics', async () => {
      const response = await request(app)
        .get('/api/rgb/stats')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalSold');
      expect(response.body.stats).toHaveProperty('batchesSold');
      expect(response.body.stats).toHaveProperty('uniqueBuyers');
    });
  });
});