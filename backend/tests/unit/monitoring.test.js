const request = require('supertest');
const express = require('express');
const monitoringRouter = require('../../src/routes/monitoring');
const app = express(); app.use('/api/monitoring', monitoringRouter);

describe('GET /api/monitoring/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/monitoring/health');
    expect(res.status).toBe(200); expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime'); expect(res.body).toHaveProperty('memory');
    expect(res.body).toHaveProperty('system'); expect(res.body).toHaveProperty('services');
  });
  it('has valid timestamp', async () => {
    const res = await request(app).get('/api/monitoring/health');
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });
  it('services have database, redis, whatsapp', async () => {
    const res = await request(app).get('/api/monitoring/health');
    expect(res.body.services).toHaveProperty('database');
    expect(res.body.services).toHaveProperty('redis');
    expect(res.body.services).toHaveProperty('whatsapp');
  });
});

describe('GET /api/monitoring/metrics', () => {
  it('returns prometheus metrics', async () => {
    const res = await request(app).get('/api/monitoring/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('supersender_uptime_seconds');
    expect(res.text).toContain('supersender_memory_heap_used_bytes');
  });
});

describe('GET /api/monitoring/info', () => {
  it('returns app info', async () => {
    const res = await request(app).get('/api/monitoring/info');
    expect(res.status).toBe(200); expect(res.body.app).toBe('SuperSender Pro');
    expect(res.body).toHaveProperty('environment'); expect(res.body).toHaveProperty('nodeVersion');
  });
});