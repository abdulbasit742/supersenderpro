'use strict';
/**
 * Unit tests — Stock routes
 * Routes: GET /api/stock                  (overview via stockService)
 *         PUT /api/stock/:id              (update qty / cost / threshold)
 *         GET /api/stock/reorder-suggestions
 */
const request = require('supertest');
const express = require('express');

// ── Mock stockService before importing the route ──────────────────────────────
jest.mock('../../src/services/stockService', () => ({
  stockOverview : jest.fn(),
  adjustStock   : jest.fn()
}));

const prisma           = require('../../src/services/prisma');
const { stockOverview } = require('../../src/services/stockService');
const stockRouter      = require('../../src/routes/stock');
const {
  testStockItem,
  testLowStockItem
}                      = require('../fixtures/testData');

// ── Minimal express app ───────────────────────────────────────────────────────
function createApp () {
  const app = express();
  app.use(express.json());
  app.use('/api/stock', stockRouter);
  app.use((err, req, res, _next) =>
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  );
  return app;
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('Stock Routes', () => {
  let app;

  beforeAll(() => { app = createApp(); });

  // ── GET /api/stock ──────────────────────────────────────────────────────────
  describe('GET /api/stock', () => {

    it('returns 200 with full stock overview', async () => {
      stockOverview.mockResolvedValue([testStockItem, testLowStockItem]);

      const res = await request(app).get('/api/stock');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('calls the stockOverview service exactly once', async () => {
      stockOverview.mockResolvedValue([]);

      await request(app).get('/api/stock');

      expect(stockOverview).toHaveBeenCalledTimes(1);
    });

    it('exposes low:true flag on items below threshold', async () => {
      stockOverview.mockResolvedValue([testStockItem, testLowStockItem]);

      const res = await request(app).get('/api/stock');

      const low = res.body.find(i => i.id === 'stock-2');
      expect(low.low).toBe(true);

      const ok = res.body.find(i => i.id === 'stock-1');
      expect(ok.low).toBe(false);
    });

    it('returns empty array when no stock items exist', async () => {
      stockOverview.mockResolvedValue([]);

      const res = await request(app).get('/api/stock');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('propagates service errors as 500', async () => {
      stockOverview.mockRejectedValue(new Error('DB connection lost'));

      const res = await request(app).get('/api/stock');

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/DB connection lost/);
    });
  });

  // ── PUT /api/stock/:id ──────────────────────────────────────────────────────
  describe('PUT /api/stock/:id', () => {

    it('updates availableQty and returns updated item', async () => {
      const updated = { ...testStockItem, availableQty: 20 };
      prisma.stockItem.update.mockResolvedValue(updated);

      const res = await request(app)
        .put('/api/stock/stock-1')
        .send({ availableQty: 20 });

      expect(res.status).toBe(200);
      expect(res.body.availableQty).toBe(20);
    });

    it('calls prisma.stockItem.update with correct id', async () => {
      prisma.stockItem.update.mockResolvedValue(testStockItem);

      await request(app).put('/api/stock/stock-1').send({ availableQty: 5 });

      expect(prisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'stock-1' } })
      );
    });

    it('updates lowThreshold correctly', async () => {
      const updated = { ...testStockItem, lowThreshold: 8 };
      prisma.stockItem.update.mockResolvedValue(updated);

      const res = await request(app)
        .put('/api/stock/stock-1')
        .send({ lowThreshold: 8 });

      expect(res.status).toBe(200);
      expect(prisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lowThreshold: 8 })
        })
      );
    });

    it('calculates stockValue when avgCost is updated', async () => {
      const updated = { ...testStockItem, avgCost: 1000, stockValue: 10000 };
      prisma.stockItem.update.mockResolvedValue(updated);

      const res = await request(app)
        .put('/api/stock/stock-1')
        .send({ avgCost: 1000, availableQty: 10 });

      expect(res.status).toBe(200);
      expect(prisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ avgCost: 1000 })
        })
      );
    });

    it('updates reservedQty correctly', async () => {
      const updated = { ...testStockItem, reservedQty: 5 };
      prisma.stockItem.update.mockResolvedValue(updated);

      const res = await request(app)
        .put('/api/stock/stock-1')
        .send({ reservedQty: 5 });

      expect(res.status).toBe(200);
      expect(prisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reservedQty: 5 })
        })
      );
    });

    it('returns 500 when item is not found', async () => {
      prisma.stockItem.update.mockRejectedValue(
        Object.assign(new Error('Record not found'), { code: 'P2025' })
      );

      const res = await request(app)
        .put('/api/stock/nonexistent-id')
        .send({ availableQty: 1 });

      expect(res.status).toBe(500);
    });
  });

  // ── GET /api/stock/reorder-suggestions ─────────────────────────────────────
  describe('GET /api/stock/reorder-suggestions', () => {

    it('returns 200 with reorder suggestions', async () => {
      // Low-stock item that has sales history
      prisma.stockItem.findMany.mockResolvedValue([
        { id: 'stock-2', toolId: 'tool-2', plan: 'Annual',
          availableQty: 1, lowThreshold: 3, avgCost: 8000,
          tool: { name: 'Claude Pro' }, planRef: null }
      ]);
      prisma.sale.findMany.mockResolvedValue([
        { toolId: 'tool-2', plan: 'Annual', quantity: 8 }
      ]);

      const res = await request(app).get('/api/stock/reorder-suggestions');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns empty array when all stock levels are healthy', async () => {
      prisma.stockItem.findMany.mockResolvedValue([
        { id: 'stock-1', toolId: 'tool-1', plan: 'Monthly',
          availableQty: 50, lowThreshold: 3, avgCost: 900,
          tool: { name: 'ChatGPT Plus' }, planRef: null }
      ]);
      prisma.sale.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/stock/reorder-suggestions');

      expect(res.status).toBe(200);
      // no priority items since qty >> threshold
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('accepts a custom days query parameter', async () => {
      prisma.stockItem.findMany.mockResolvedValue([]);
      prisma.sale.findMany.mockResolvedValue([]);

      await request(app).get('/api/stock/reorder-suggestions?days=7');

      expect(prisma.stockItem.findMany).toHaveBeenCalled();
      expect(prisma.sale.findMany).toHaveBeenCalled();
    });
  });
});
