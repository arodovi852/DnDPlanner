/**
 * Smoke tests: the Express app builds and the public health endpoint
 * answers without a token. Auth-specific scenarios live in `auth.test.js`.
 */
const request = require('supertest');
const buildApp = require('../src/app');

describe('Smoke', () => {
  const app = buildApp({ enableRateLimit: false });

  it('GET /api/health returns 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('GET /api/docs/openapi.json returns the OpenAPI document', async () => {
    const response = await request(app).get('/api/docs/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('openapi');
    expect(response.body.info.title).toBe('DnDPlanner API');
  });
});
