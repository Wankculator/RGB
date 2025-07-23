const request = require('supertest');
const app = require('../../server/app');

describe('Health Routes', () => {
  test('GET /health should return status ok', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'litecat-api');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /health should be accessible without authentication', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.status).toBe(200);
  });
});