'use strict';
/**
 * Unit tests — Dealers routes
 * Routes: GET    /api/dealers
 *         POST   /api/dealers
 *         PUT    /api/dealers/:id
 *         DELETE /api/dealers/:id
 *         GET    /api/dealers/:id/performance
 */
const request = require('supertest');
const express = require('express');

const prisma        = require('../../src/services/prisma');
const dealersRouter = require('../../src/routes/dealers');
const { testDealer } = require('../fixtures/testData');

// ── Minimal express app ───────────────────────────────────────────────────────
function createApp () {
  const app = express();
  app.use(express.json());
  app.use('/api/dealers', dealersRouter);
  app.use((err, req, res, _next) =>
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  );
  return app;
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('Dealers Routes', () => {
  let app;

  beforeAll(() => { app = createApp(); });

  // ── GET /api/dealers ────────────────────────────────────────────────────────
  describe('GET /api/dealers', () => {

    it('returns 200 with list of dealers', async () => {
      prisma.dealer.findMany.mockResolvedValue([testDealer]);

      const res = await request(app).get('/api/dealers');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('dealer-1');
    });

    it('returns empty array when no dealers exist', async () => {
      prisma.dealer.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/dealers');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('passes priority:true filter when query param is set', async () => {
      prisma.dealer.findMany.mockResolvedValue([testDealer]);

      await request(app).get('/api/dealers?priority=true');

      expect(prisma.dealer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ priority: true })
        })
      );
    });

    it('passes isScammer:true filter when scammer=true', async () => {
      prisma.dealer.findMany.mockResolvedValue([]);

      await request(app).get('/api/dealers?scammer=true');

      expect(prisma.dealer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isScammer: true })
        })
      );
    });

    it('passes minReliability filter when provided', async () => {
      prisma.dealer.findMany.mockResolvedValue([]);

      await request(app).get('/api/dealers?minReliability=80');

      expect(prisma.dealer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reliabilityScore: { gte: 80 }
          })
        })
      );
    });
  });

  // ── POST /api/dealers ──────────────────────────────────────────────────────
  describe('POST /api/dealers', () => {

    it('creates a new dealer and returns 201', async () => {
      prisma.dealer.upsert.mockResolvedValue(testDealer);

      const res = await request(app)
        .post('/api/dealers')
        .send({
          name           : 'New Dealer',
          whatsappNumber : '923009999999',
          toolsAvailable : ['ChatGPT Plus'],
          reliabilityScore: 75
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('dealer-1');
    });

    it('uses upsert so duplicate phone just updates', async () => {
      prisma.dealer.upsert.mockResolvedValue({ ...testDealer, name: 'Updated Dealer' });

      const res = await request(app)
        .post('/api/dealers')
        .send({ name: 'Updated Dealer', whatsappNumber: '923009999999' });

      expect(res.status).toBe(201);
      expect(prisma.dealer.upsert).toHaveBeenCalledTimes(1);
    });

    it('normalizes phone number (leading 0 → 92)', async () => {
      prisma.dealer.upsert.mockResolvedValue({ ...testDealer, whatsappNumber: '923009999999' });

      await request(app)
        .post('/api/dealers')
        .send({ whatsappNumber: '03009999999' });

      const callArgs = prisma.dealer.upsert.mock.calls[0][0];
      expect(callArgs.where.whatsappNumber).toBe('923009999999');
    });

    it('marks dealer as scammer when isScammer flag is set', async () => {
      const scammerDealer = { ...testDealer, isScammer: true, scamNotes: 'Sent fake credentials' };
      prisma.dealer.upsert.mockResolvedValue(scammerDealer);

      const res = await request(app)
        .post('/api/dealers')
        .send({ whatsappNumber: '923001111111', isScammer: true, scamNotes: 'Sent fake credentials' });

      expect(res.status).toBe(201);
    });
  });

  // ── PUT /api/dealers/:id ───────────────────────────────────────────────────
  describe('PUT /api/dealers/:id', () => {

    it('updates dealer fields and returns updated record', async () => {
      const updated = { ...testDealer, reliabilityScore: 95 };
      prisma.dealer.update.mockResolvedValue(updated);

      const res = await request(app)
        .put('/api/dealers/dealer-1')
        .send({ reliabilityScore: 95 });

      expect(res.status).toBe(200);
      expect(res.body.reliabilityScore).toBe(95);
    });

    it('calls prisma.dealer.update with correct id', async () => {
      prisma.dealer.update.mockResolvedValue(testDealer);

      await request(app)
        .put('/api/dealers/dealer-1')
        .send({ notes: 'Very reliable' });

      expect(prisma.dealer.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'dealer-1' } })
      );
    });

    it('sets priority:true correctly', async () => {
      prisma.dealer.update.mockResolvedValue({ ...testDealer, priority: true });

      const res = await request(app)
        .put('/api/dealers/dealer-1')
        .send({ priority: true });

      expect(res.status).toBe(200);
      expect(prisma.dealer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: true })
        })
      );
    });

    it('marks dealer as scammer via update', async () => {
      prisma.dealer.update.mockResolvedValue({ ...testDealer, isScammer: true });

      const res = await request(app)
        .put('/api/dealers/dealer-1')
        .send({ isScammer: true, scamNotes: 'Scam confirmed' });

      expect(res.status).toBe(200);
    });

    it('returns 500 when dealer id does not exist', async () => {
      prisma.dealer.update.mockRejectedValue(new Error('Record not found'));

      const res = await request(app)
        .put('/api/dealers/nonexistent')
        .send({ notes: 'test' });

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /api/dealers/:id ────────────────────────────────────────────────
  describe('DELETE /api/dealers/:id', () => {

    it('deletes dealer and returns success', async () => {
      prisma.dealer.delete.mockResolvedValue(testDealer);

      const res = await request(app).delete('/api/dealers/dealer-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('calls prisma.dealer.delete with correct id', async () => {
      prisma.dealer.delete.mockResolvedValue(testDealer);

      await request(app).delete('/api/dealers/dealer-1');

      expect(prisma.dealer.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'dealer-1' } })
      );
    });

    it('returns 500 when dealer does not exist', async () => {
      prisma.dealer.delete.mockRejectedValue(new Error('Record to delete not found'));

      const res = await request(app).delete('/api/dealers/ghost-id');

      expect(res.status).toBe(500);
    });
  });

  // ── GET /api/dealers/:id/performance ───────────────────────────────────────
  describe('GET /api/dealers/:id/performance', () => {

    it('returns dealer performance summary', async () => {
      prisma.dealer.findUnique.mockResolvedValue(testDealer);
      prisma.purchase.findMany.mockResolvedValue([
        { id: 'p-1', dealerId: 'dealer-1', totalCost: 5000, purchaseDate: new Date() }
      ]);
      prisma.rateEntry.findMany.mockResolvedValue([
        { id: 'r-1', dealerId: 'dealer-1', buyPrice: 850, rateDate: new Date() }
      ]);

      const res = await request(app).get('/api/dealers/dealer-1/performance');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('dealer');
      expect(res.body).toHaveProperty('totalOrders');
      expect(res.body).toHaveProperty('totalAmount');
      expect(res.body.totalOrders).toBe(1);
    });

    it('returns 404 when dealer does not exist', async () => {
      prisma.dealer.findUnique.mockResolvedValue(null);
      prisma.purchase.findMany.mockResolvedValue([]);
      prisma.rateEntry.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/dealers/ghost-dealer/performance');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Dealer not found');
    });

    it('returns zero totalAmount when no purchases exist', async () => {
      prisma.dealer.findUnique.mockResolvedValue(testDealer);
      prisma.purchase.findMany.mockResolvedValue([]);
      prisma.rateEntry.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/dealers/dealer-1/performance');

      expect(res.status).toBe(200);
      expect(res.body.totalAmount).toBe(0);
      expect(res.body.totalOrders).toBe(0);
    });
  });
});
