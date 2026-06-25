const request = require('supertest');
const express = require('express');
const prisma = require('../../src/services/prisma');

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed'),
}));
const bcrypt = require('bcryptjs');

const authRouter = require('../../src/routes/auth');
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const mockUser = { id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN', active: true, passwordHash: 'hashed' };
beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('admin@test.com');
  });
  it('should return 400 when email missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'pass' });
    expect(res.status).toBe(400);
  });
  it('should return 400 when password missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com' });
    expect(res.status).toBe(400);
  });
  it('should return 401 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({ email: 'no@test.com', password: 'pass' });
    expect(res.status).toBe(401);
  });
  it('should return 401 when password wrong', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
  it('should return 401 when user inactive', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...mockUser, active: false });
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'pass' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
  it('should return 401 with bad token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
  });
});