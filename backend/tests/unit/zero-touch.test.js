'use strict';
/**
 * Unit tests — Zero-Touch routes
 * Routes: GET /api/zero-touch/summary
 *         GET /api/zero-touch/dynamic-availability
 */
const request = require('supertest');
const express = require('express');

const mockZeroTouchSummary        = jest.fn();
const mockGetDynamicAvailability  = jest.fn();
const mockBuildCustomerProfile    = jest.fn();
const mockRunZeroTouchJob         = jest.fn();
const mockBuildPricingRecommendations = jest.fn();

jest.mock('../../src/zeroTouch', () => ({
  zeroTouchSummary:          mockZeroTouchSummary,
  getDynamicAvailability:    mockGetDynamicAvailability,
  buildCustomerProfile:      mockBuildCustomerProfile,
  runZeroTouchJob:           mockRunZeroTouchJob,
  buildPricingRecommendations: mockBuildPricingRecommendations,
}));

jest.mock('../../src/utils/phone', () => ({
  normalizePhone: jest.fn((p) => String(p || ''))
  }));

const zeroTouchRouter = require('../../src/routes/zero-touch');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/zero-touch', zeroTouchRouter);
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message || 'Internal server error' }));
  return app;
}

describe('Zero-Touch Routes', () => {
  let app;

  beforeAll(() => { app = createApp(); });

  // ── GET /api/zero-touch/summary ──────────────────────────────────────────
  describe('GET /api/zero-touch/summary', () => {

    it('returns summary data with pending orders and auto-fulfilled count', async () => {
      const summaryData = { pendingOrders: 5, autoFulfilled: 12, lowStock: ['ChatGPT Plus'] };
      mockZeroTouchSummary.mockResolvedValue(summaryData);
      const res = await request(app).get('/api/zero-touch/summary');
      expect(res.status).toBe(200);
      expect(res.body.pendingOrders).toBe(5);
      expect(res.body.autoFulfilled).toBe(12);
      expect(Array.isArray(res.body.lowStock)).toBe(true);
    });

    it('returns empty summary when no data available', async () => {
      mockZeroTouchSummary.mockResolvedValue({ pendingOrders: 0, autoFulfilled: 0, lowStock: [] });
      const res = await request(app).get('/api/zero-touch/summary');
      expect(res.status).toBe(200);
      expect(res.body.pendingOrders).toBe(0);
    });

    it('returns 500 when service throws', async () => {
      mockZeroTouchSummary.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/api/zero-touch/summary');
      expect(res.status).toBe(500);
    });

    it('calls zeroTouchSummary exactly once', async () => {
      mockZeroTouchSummary.mockResolvedValue({ pendingOrders: 0 });
      await request(app).get('/api/zero-touch/summary');
      expect(mockZeroTouchSummary).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /api/zero-touch/dynamic-availability ─────────────────────────────
  describe('GET /api/zero-touch/dynamic-availability', () => {

    it('returns availability data', async () => {
      mockGetDynamicAvailability.mockResolvedValue({ available: true, tools: ['ChatGPT Plus', 'Claude Pro'] });
      const res = await request(app).get('/api/zero-touch/dynamic-availability');
      expect(res.status).toBe(200);
      expect(res.body.available).toBe(true);
      expect(res.body.tools).toHaveLength(2);
    });

    it('passes phone query param to service', async () => {
      mockGetDynamicAvailability.mockResolvedValue({ available: true, tools: [] });
      await request(app).get('/api/zero-touch/dynamic-availability?phone=923001234567');
      expect(mockGetDynamicAvailability).toHaveBeenCalledWith('923001234567');
    });

    it('passes empty string when no phone provided', async () => {
      mockGetDynamicAvailability.mockResolvedValue({ available: false, tools: [] });
      await request(app).get('/api/zero-touch/dynamic-availability');
      expect(mockGetDynamicAvailability).toHaveBeenCalledWith('');
    });

    it('returns 500 when availability service throws', async () => {
      mockGetDynamicAvailability.mockRejectedValue(new Error('Service unavailable'));
      const res = await request(app).get('/api/zero-touch/dynamic-availability');
      expect(res.status).toBe(500);
    });

    it('reports unavailable when no tools in stock', async () => {
      mockGetDynamicAvailability.mockResolvedValue({ available: false, tools: [] });
      const res = await request(app).get('/api/zero-touch/dynamic-availability?phone=923001234567');
      expect(res.status).toBe(200);
      expect(res.body.available).toBe(false);
      expect(res.body.tools).toHaveLength(0);
    });
  });
});