'use strict';
/**
 * Unit tests — Tools routes
 * Routes: GET  /api/tools
 *         POST /api/tools
 *         PUT  /api/tools/plans/:id
 */
const request = require('supertest');
const express = require('express');
const prisma  = require('../../src/services/prisma');

jest.mock('../../src/services/rateService', () => ({
  slugify: jest.fn((name) => String(name).toLowerCase().replace(/s+/g, '-'))
  }));

const toolsRouter = require('../../src/routes/tools');

const testTool = {
  id: 'tool-1', name: 'ChatGPT Plus', slug: 'chatgpt-plus',
  category: 'AI Tool', active: true, plans: [], stockItems: []
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/tools', toolsRouter);
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message || 'Internal server error' }));
  return app;
}

describe('Tools Routes', () => {
  let app;

  beforeAll(() => {
    app = createApp();
    prisma.tool     = { findMany: jest.fn(), create: jest.fn() };
    prisma.toolPlan = { update: jest.fn() };
  });

  // ── GET /api/tools ───────────────────────────────────────────────────────
  describe('GET /api/tools', () => {

    it('returns list of tools', async () => {
      prisma.tool.findMany.mockResolvedValue([testTool]);
      const res = await request(app).get('/api/tools');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('tool-1');
    });

    it('returns empty array when no tools exist', async () => {
      prisma.tool.findMany.mockResolvedValue([]);
      const res = await request(app).get('/api/tools');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('includes plans and stockItems in response', async () => {
      const toolWithPlans = { ...testTool, plans: [{ id: 'p-1', name: 'Monthly' }], stockItems: [{ id: 's-1' }] };
      prisma.tool.findMany.mockResolvedValue([toolWithPlans]);
      const res = await request(app).get('/api/tools');
      expect(res.status).toBe(200);
      expect(res.body[0].plans).toHaveLength(1);
      expect(res.body[0].stockItems).toHaveLength(1);
    });

    it('orders tools by name ascending', async () => {
      prisma.tool.findMany.mockResolvedValue([]);
      await request(app).get('/api/tools');
      expect(prisma.tool.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } })
      );
    });
  });

  // ── POST /api/tools ──────────────────────────────────────────────────────
  describe('POST /api/tools', () => {

    it('creates a new tool and returns 201', async () => {
      prisma.tool.create.mockResolvedValue(testTool);
      const res = await request(app).post('/api/tools').send({ name: 'ChatGPT Plus', category: 'AI Tool' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('tool-1');
      expect(res.body.name).toBe('ChatGPT Plus');
    });

    it('auto-generates slug from name when not provided', async () => {
      prisma.tool.create.mockResolvedValue(testTool);
      await request(app).post('/api/tools').send({ name: 'New Tool' });
      expect(prisma.tool.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: expect.any(String) })
        })
      );
    });

    it('uses provided slug when given', async () => {
      prisma.tool.create.mockResolvedValue({ ...testTool, slug: 'custom-slug' });
      await request(app).post('/api/tools').send({ name: 'My Tool', slug: 'custom-slug' });
      expect(prisma.tool.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'custom-slug' })
        })
      );
    });

    it('defaults active to true when not specified', async () => {
      prisma.tool.create.mockResolvedValue(testTool);
      await request(app).post('/api/tools').send({ name: 'My Tool' });
      expect(prisma.tool.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ active: true })
        })
      );
    });

    it('respects active:false when specified', async () => {
      prisma.tool.create.mockResolvedValue({ ...testTool, active: false });
      await request(app).post('/api/tools').send({ name: 'Inactive Tool', active: false });
      expect(prisma.tool.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ active: false })
        })
      );
    });

    it('creates tool with plans when provided', async () => {
      const toolWithPlans = { ...testTool, plans: [{ id: 'p-1', name: 'Monthly', slug: 'monthly' }] };
      prisma.tool.create.mockResolvedValue(toolWithPlans);
      const res = await request(app).post('/api/tools').send({
        name: 'ChatGPT Plus',
        plans: [{ name: 'Monthly', defaultSellPrice: 1800 }]
      });
      expect(res.status).toBe(201);
      expect(res.body.plans).toHaveLength(1);
    });
  });

  // ── PUT /api/tools/plans/:id ─────────────────────────────────────────────
  describe('PUT /api/tools/plans/:id', () => {

    it('updates a tool plan and returns it', async () => {
      const updatedPlan = { id: 'plan-1', name: 'Monthly', defaultSellPrice: 1800 };
      prisma.toolPlan.update.mockResolvedValue(updatedPlan);
      const res = await request(app).put('/api/tools/plans/plan-1').send({ defaultSellPrice: 1800 });
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('plan-1');
      expect(res.body.defaultSellPrice).toBe(1800);
    });

    it('calls update with correct plan id', async () => {
      prisma.toolPlan.update.mockResolvedValue({ id: 'plan-1', name: 'Monthly' });
      await request(app).put('/api/tools/plans/plan-1').send({ active: false });
      expect(prisma.toolPlan.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'plan-1' } })
      );
    });

    it('updates margin and threshold fields', async () => {
      const updated = { id: 'plan-1', desiredMarginPct: 25, lowStockThreshold: 5 };
      prisma.toolPlan.update.mockResolvedValue(updated);
      const res = await request(app).put('/api/tools/plans/plan-1').send({ desiredMarginPct: 25, lowStockThreshold: 5 });
      expect(res.status).toBe(200);
      expect(res.body.desiredMarginPct).toBe(25);
    });

    it('returns 500 when plan not found', async () => {
      prisma.toolPlan.update.mockRejectedValue(new Error('Record to update not found'));
      const res = await request(app).put('/api/tools/plans/nonexistent').send({ active: false });
      expect(res.status).toBe(500);
    });
  });
});