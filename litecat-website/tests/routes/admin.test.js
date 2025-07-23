const request = require('supertest');
const app = require('../../server/app');

describe('Admin Routes', () => {
  const adminToken = 'test-admin-token'; // In real tests, generate from login
  
  describe('POST /api/admin/login', () => {
    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'wrong@email.com',
          password: 'wrongpassword'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should require email and password', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Protected Admin Routes', () => {
    test('GET /api/admin/stats should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/admin/close-mint should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/close-mint')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/admin/purchases should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/purchases')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});