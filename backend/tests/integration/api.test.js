const request = require('supertest');
const express = require('express');
function buildApp() {
  const app = express(); app.use(express.json()); app.set('io', { emit: jest.fn() });
  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.use('/api/monitoring', require('../../src/routes/monitoring'));
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}
let app; beforeAll(() => { app = buildApp(); });

describe('Integration: Core API', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200); expect(res.body.status).toBe('ok');
  });
  it('GET /api/monitoring/health - detailed', async () => {
    const res = await request(app).get('/api/monitoring/health');
    expect(res.status).toBe(200); expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });
  it('GET /api/monitoring/metrics returns text', async () => {
    const res = await request(app).get('/api/monitoring/metrics');
    expect(res.status).toBe(200); expect(res.headers['content-type']).toMatch(/text/);
  });
  it('GET /api/monitoring/info returns app name', async () => {
    const res = await request(app).get('/api/monitoring/info');
    expect(res.status).toBe(200); expect(res.body.app).toBe('SuperSender Pro');
  });
});