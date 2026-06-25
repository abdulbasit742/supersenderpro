'use strict';
/**
 * Unit tests — Settings routes
 * Routes: GET /api/settings
 *         PUT /api/settings
 */
const request = require('supertest');
const express = require('express');
const prisma   = require('../../src/services/prisma');

jest.mock('../../src/services/sheetsService', () => ({ syncDailyToSheets: jest.fn().mockResolvedValue({ success: true }) }));
jest.mock('../../src/config/env', () => ({ adminNumber: '', lowStockThreshold: 5, sellingGroups: [], customerGroups: [], privateAccountLabel: 'Limited Time Offer' }));

const settingsRouter = require('../../src/routes/settings');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/settings', settingsRouter);
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message || 'Internal server error' }));
  return app;
}

describe('Settings Routes', () => {
  let app;

  beforeAll(() => {
    app = createApp();
    prisma.setting = { findMany: jest.fn(), upsert: jest.fn() };
    prisma.accountType = { findUnique: jest.fn() };
    prisma.tool       = { findFirst: jest.fn() };
    prisma.toolPlan   = { findMany: jest.fn() };
    prisma.pricing    = { upsert: jest.fn() };
    prisma.messageTemplate = { findMany: jest.fn(), upsert: jest.fn() };
  });

  // ── GET /api/settings ────────────────────────────────────────────────────
  describe('GET /api/settings', () => {

    it('returns settings as key-value object', async () => {
      prisma.setting.findMany.mockResolvedValue([
        { key: 'ADMIN_NUMBER', value: '923001234567' },
        { key: 'AI_PROVIDER',  value: 'openai' }
      ]);
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.ADMIN_NUMBER).toBe('923001234567');
      expect(res.body.AI_PROVIDER).toBe('openai');
    });

    it('returns empty object when no settings exist', async () => {
      prisma.setting.findMany.mockResolvedValue([]);
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it('orders results by key ascending', async () => {
      prisma.setting.findMany.mockResolvedValue([]);
      await request(app).get('/api/settings');
      expect(prisma.setting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { key: 'asc' } })
      );
    });
  });

  // ── PUT /api/settings ────────────────────────────────────────────────────
  describe('PUT /api/settings', () => {

    it('saves valid settings and returns success', async () => {
      prisma.setting.upsert.mockResolvedValue({ key: 'AI_PROVIDER', value: 'openai' });
      prisma.adminAlert.create.mockResolvedValue({});
      const res = await request(app).put('/api/settings').send({ AI_PROVIDER: 'openai' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.saved).toHaveLength(1);
      expect(res.body.reloaded).toBe(true);
    });

    it('saves multiple settings at once', async () => {
      prisma.setting.upsert.mockResolvedValue({ key: 'ADMIN_NUMBER', value: '923001234567' });
      prisma.adminAlert.create.mockResolvedValue({});
      const res = await request(app).put('/api/settings').send({ ADMIN_NUMBER: '923001234567', AI_PROVIDER: 'openai' });
      expect(res.status).toBe(200);
      expect(res.body.saved).toHaveLength(2);
    });

    it('rejects unknown setting key with 400', async () => {
      const res = await request(app).put('/api/settings').send({ UNKNOWN_KEY: 'value' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid settings/i);
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('rejects invalid phone number format for ADMIN_NUMBER', async () => {
      const res = await request(app).put('/api/settings').send({ ADMIN_NUMBER: 'not-a-phone' });
      expect(res.status).toBe(400);
      expect(res.body.errors[0]).toMatch(/ADMIN_NUMBER/);
    });

    it('rejects LOW_STOCK_THRESHOLD out of range (> 1000)', async () => {
      const res = await request(app).put('/api/settings').send({ LOW_STOCK_THRESHOLD: 9999 });
      expect(res.status).toBe(400);
      expect(res.body.errors[0]).toMatch(/THRESHOLD/);
    });

    it('rejects negative threshold', async () => {
      const res = await request(app).put('/api/settings').send({ LOW_STOCK_THRESHOLD: -1 });
      expect(res.status).toBe(400);
    });

    it('saves LOW_STOCK_THRESHOLD within valid range', async () => {
      prisma.setting.upsert.mockResolvedValue({ key: 'LOW_STOCK_THRESHOLD', value: '10' });
      prisma.adminAlert.create.mockResolvedValue({});
      const res = await request(app).put('/api/settings').send({ LOW_STOCK_THRESHOLD: 10 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('upserts each key individually', async () => {
      prisma.setting.upsert.mockResolvedValue({ key: 'AI_MODEL', value: 'gpt-4o' });
      prisma.adminAlert.create.mockResolvedValue({});
      await request(app).put('/api/settings').send({ AI_MODEL: 'gpt-4o' });
      expect(prisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'AI_MODEL' } })
      );
    });
  });
});