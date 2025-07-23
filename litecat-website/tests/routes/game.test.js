const request = require('supertest');
const app = require('../../server/app');

describe('Game Routes', () => {
  describe('POST /api/game/score', () => {
    test('should save valid game score', async () => {
      const response = await request(app)
        .post('/api/game/score')
        .send({
          score: 25,
          duration: 30,
          tier: 'silver',
          walletAddress: 'test-wallet-123'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('scoreId');
    });

    test('should reject invalid score data', async () => {
      const response = await request(app)
        .post('/api/game/score')
        .send({
          score: -5,
          duration: 1000
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should validate tier based on score', async () => {
      const response = await request(app)
        .post('/api/game/score')
        .send({
          score: 10,
          duration: 30,
          tier: 'gold' // Wrong tier for score 10
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/game/leaderboard', () => {
    test('should return top scores', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('leaderboard');
      expect(Array.isArray(response.body.leaderboard)).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard?limit=10&offset=0')
        .expect(200);
      
      expect(response.body.leaderboard.length).toBeLessThanOrEqual(10);
    });
  });
});