'use strict';
const request = require('supertest');
const express = require('express');
const prisma = require('../../src/services/prisma');
jest.mock('node-cron', () => ({ validate: jest.fn(() => true), schedule: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })) }));
jest.mock('../../src/whatsapp/baileysClient', () => ({ sendWhatsAppMessage: jest.fn() }));
jest.mock('../../src/whatsapp/waSenderIntegration', () => ({ broadcastToGroups: jest.fn() }));
jest.mock('../../src/utils/templates', () => ({ renderTemplate: jest.fn((msg) => msg) }));
const { broadcastToGroups } = require('../../src/whatsapp/waSenderIntegration');
const { sendWhatsAppMessage } = require('../../src/whatsapp/baileysClient');
const broadcastRouter = require('../../src/routes/broadcast');
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/broadcast', broadcastRouter);
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message || 'Internal server error' }));
  return app;
}
const mockBroadcast = { id: 'bc-1', title: 'Test Broadcast', message: 'Hello everyone', targetType: 'groups', targetIds: [], status: 'DRAFT', createdAt: new Date().toISOString() };
describe('Broadcast Routes', () => {
  let app;
  beforeAll(() => {
    app = createApp();
    prisma.broadcast = { findMany: jest.fn(), create: jest.fn() };
    prisma.whatsAppGroup = { findMany: jest.fn() };
  });
  beforeEach(() => jest.clearAllMocks());
  describe('GET /api/broadcast', () => {
    it('returns 200 with broadcast list', async () => {
      prisma.broadcast.findMany.mockResolvedValue([mockBroadcast]);
      const res = await request(app).get('/api/broadcast');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe('bc-1');
    });
    it('returns empty array when no broadcasts', async () => {
      prisma.broadcast.findMany.mockResolvedValue([]);
      const res = await request(app).get('/api/broadcast');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
    it('returns 500 on db error', async () => {
      prisma.broadcast.findMany.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/api/broadcast');
      expect(res.status).toBe(500);
    });
  });
  describe('POST /api/broadcast', () => {
    it('creates broadcast and returns 201', async () => {
      prisma.broadcast.create.mockResolvedValue(mockBroadcast);
      const res = await request(app).post('/api/broadcast').send({ title: 'Test Broadcast', message: 'Hello', targetType: 'groups' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('bc-1');
    });
    it('defaults title to Broadcast when omitted', async () => {
      prisma.broadcast.create.mockResolvedValue({ ...mockBroadcast, title: 'Broadcast' });
      await request(app).post('/api/broadcast').send({ message: 'Hello' });
      expect(prisma.broadcast.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: 'Broadcast' }) }));
    });
    it('sets status SCHEDULED when scheduledAt provided', async () => {
      prisma.broadcast.create.mockResolvedValue({ ...mockBroadcast, status: 'SCHEDULED' });
      await request(app).post('/api/broadcast').send({ message: 'Hello', scheduledAt: new Date(Date.now() + 3600000).toISOString() });
      expect(prisma.broadcast.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SCHEDULED' }) }));
    });
    it('sets status DRAFT when no scheduledAt', async () => {
      prisma.broadcast.create.mockResolvedValue(mockBroadcast);
      await request(app).post('/api/broadcast').send({ message: 'Hello' });
      expect(prisma.broadcast.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) }));
    });
    it('returns 500 when create fails', async () => {
      prisma.broadcast.create.mockRejectedValue(new Error('DB error'));
      const res = await request(app).post('/api/broadcast').send({ message: 'Hello' });
      expect(res.status).toBe(500);
    });
  });
  describe('POST /api/broadcast/send', () => {
    it('returns 400 when message is missing', async () => {
      const res = await request(app).post('/api/broadcast/send').send({ groupIds: ['g1'] });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('message is required');
    });
    it('sends broadcast to provided groupIds', async () => {
      broadcastToGroups.mockResolvedValue({ sent: ['g1'], failed: [] });
      prisma.broadcast.create.mockResolvedValue({ ...mockBroadcast, status: 'SENT' });
      const res = await request(app).post('/api/broadcast/send').send({ message: 'Hello', groupIds: ['g1'] });
      expect(res.status).toBe(200);
      expect(broadcastToGroups).toHaveBeenCalledWith('Hello', ['g1'], expect.any(Object));
    });
  });
});