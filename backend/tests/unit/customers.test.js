'use strict';
const request = require('supertest');
const express = require('express');
const prisma = require('../../src/services/prisma');
jest.mock('../../src/utils/phone', () => ({ normalizePhone: jest.fn((v) => String(v || '')) }));
const customersRouter = require('../../src/routes/customers');
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/customers', customersRouter);
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message || 'Internal server error' }));
  return app;
}
const mockCustomer = { id: 'cust-1', name: 'Test Customer', whatsapp: '923001234567', isVip: false, notes: null, tags: [], sales: [] };
describe('Customers Routes', () => {
  let app;
  beforeAll(() => { app = createApp(); });
  beforeEach(() => jest.clearAllMocks());
  describe('GET /api/customers', () => {
    it('returns 200 with customer list', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer]);
      const res = await request(app).get('/api/customers');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe('cust-1');
    });
    it('returns empty array when no customers', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      const res = await request(app).get('/api/customers');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
    it('applies vip=true filter', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      await request(app).get('/api/customers?vip=true');
      expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isVip: true }) }));
    });
    it('applies search query filter', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer]);
      await request(app).get('/api/customers?q=test');
      expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }));
    });
    it('returns 500 on db error', async () => {
      prisma.customer.findMany.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/api/customers');
      expect(res.status).toBe(500);
    });
  });
  describe('POST /api/customers', () => {
    it('creates customer and returns 201', async () => {
      prisma.customer.upsert.mockResolvedValue(mockCustomer);
      const res = await request(app).post('/api/customers').send({ name: 'Test Customer', whatsapp: '923001234567' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('cust-1');
    });
    it('upserts on duplicate phone', async () => {
      prisma.customer.upsert.mockResolvedValue({ ...mockCustomer, name: 'Updated' });
      const res = await request(app).post('/api/customers').send({ whatsapp: '923001234567', name: 'Updated' });
      expect(res.status).toBe(201);
      expect(prisma.customer.upsert).toHaveBeenCalledTimes(1);
    });
    it('sets isVip in create data', async () => {
      prisma.customer.upsert.mockResolvedValue({ ...mockCustomer, isVip: true });
      await request(app).post('/api/customers').send({ whatsapp: '923001234567', isVip: true });
      expect(prisma.customer.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ isVip: true }) }));
    });
    it('defaults name to Customer', async () => {
      prisma.customer.upsert.mockResolvedValue(mockCustomer);
      await request(app).post('/api/customers').send({ whatsapp: '923001234567' });
      expect(prisma.customer.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ name: 'Customer' }) }));
    });
    it('returns 500 on upsert error', async () => {
      prisma.customer.upsert.mockRejectedValue(new Error('DB error'));
      const res = await request(app).post('/api/customers').send({ whatsapp: '923001234567' });
      expect(res.status).toBe(500);
    });
  });
});