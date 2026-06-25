'use strict';
const request = require('supertest');
const express = require('express');
const prisma = require('../../src/services/prisma');
jest.mock('../../src/services/profitEngine', () => ({ dailyProfitSummary: jest.fn(), marginPct: jest.fn((sell, buy) => (buy ? ((sell - buy) / buy) * 100 : 0)) }));
const { dailyProfitSummary } = require('../../src/services/profitEngine');
const analyticsRouter = require('../../src/routes/analytics');
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRouter);
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message || 'Internal server error' }));
  return app;
}
const mockSale = { id: 'sale-1', saleDate: new Date('2024-01-15T10:00:00Z'), totalRevenue: 2600, profit: 600, sellPriceEach: 2600, costEach: 2000, tool: { name: 'ChatGPT' }, buyReasonTags: ['Price'], lostReason: null, quantity: 1 };
describe('Analytics Routes', () => {
  let app;
  beforeAll(() => {
    app = createApp();
    prisma.dealer.count = jest.fn();
    prisma.customer.count = jest.fn();
    prisma.rateEntry.count = jest.fn();
    prisma.alert = { findMany: jest.fn() };
  });
  beforeEach(() => jest.clearAllMocks());
  describe('GET /api/analytics/summary', () => {
    it('returns 200 with summary data', async () => {
      dailyProfitSummary.mockResolvedValue({ revenue: 50000, profit: 12000, orders: 20, avgMargin: 24 });
      prisma.dealer.count.mockResolvedValue(5);
      prisma.customer.count.mockResolvedValue(100);
      prisma.rateEntry.count.mockResolvedValue(10);
      prisma.stockItem.findMany.mockResolvedValue([{ stockValue: 5000, availableQty: 5, lowThreshold: 3 }]);
      prisma.alert.findMany.mockResolvedValue([]);
      const res = await request(app).get('/api/analytics/summary');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('todayRevenue');
      expect(res.body.todayRevenue).toBe(50000);
    });
    it('includes activeDealers and customers count', async () => {
      dailyProfitSummary.mockResolvedValue({ revenue: 0, profit: 0, orders: 0, avgMargin: 0 });
      prisma.dealer.count.mockResolvedValue(7);
      prisma.customer.count.mockResolvedValue(42);
      prisma.rateEntry.count.mockResolvedValue(0);
      prisma.stockItem.findMany.mockResolvedValue([]);
      prisma.alert.findMany.mockResolvedValue([]);
      const res = await request(app).get('/api/analytics/summary');
      expect(res.status).toBe(200);
      expect(res.body.activeDealers).toBe(7);
      expect(res.body.customers).toBe(42);
    });
    it('returns 500 when dailyProfitSummary throws', async () => {
      dailyProfitSummary.mockRejectedValue(new Error('Engine error'));
      const res = await request(app).get('/api/analytics/summary');
      expect(res.status).toBe(500);
    });
  });
  describe('GET /api/analytics/profit', () => {
    it('returns 200 with profit breakdown', async () => {
      prisma.sale.findMany.mockResolvedValue([mockSale]);
      const res = await request(app).get('/api/analytics/profit');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('daily');
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body.totalRevenue).toBe(2600);
    });
    it('returns zero totals when no sales', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      const res = await request(app).get('/api/analytics/profit');
      expect(res.status).toBe(200);
      expect(res.body.daily).toEqual([]);
      expect(res.body.totalRevenue).toBe(0);
    });
    it('returns 500 on db error', async () => {
      prisma.sale.findMany.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/api/analytics/profit');
      expect(res.status).toBe(500);
    });
  });
  describe('GET /api/analytics/insights', () => {
    it('returns 200 with insights shape', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      prisma.customer.findMany.mockResolvedValue([]);
      const res = await request(app).get('/api/analytics/insights');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('whyBuy');
      expect(res.body).toHaveProperty('conversionRate');
    });
    it('returns seeded data when no real sales exist', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      prisma.customer.findMany.mockResolvedValue([]);
      const res = await request(app).get('/api/analytics/insights');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.whyBuy)).toBe(true);
      expect(res.body.whyBuy.length).toBeGreaterThan(0);
    });
  });
});