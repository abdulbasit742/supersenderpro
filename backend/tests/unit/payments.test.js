const request = require('supertest');
const express = require('express');
const prisma = require('../../src/services/prisma');
jest.mock('../../src/payment/emailParser', () => ({ parsePaymentEmail: jest.fn((i) => ({ type: 'JAZZCASH', amount: 1800, txnId: 'TXN123', sender: '03001234567' })), startPaymentEmailWatcher: jest.fn() }));
jest.mock('../../src/payment/verifier', () => ({ verifyPaymentNotification: jest.fn(), manualVerifyTransaction: jest.fn() }));
const { verifyPaymentNotification, manualVerifyTransaction } = require('../../src/payment/verifier');
const paymentsRouter = require('../../src/routes/payments');
const app = express(); app.use(express.json()); app.set('io', { emit: jest.fn() }); app.use('/api/payments', paymentsRouter);
beforeEach(() => jest.clearAllMocks());

describe('GET /api/payments/notifications', () => {
  it('returns list', async () => {
    prisma.paymentNotification.findMany.mockResolvedValue([{ id: 'p1', type: 'JAZZCASH', amount: 1800, status: 'MATCHED' }]);
    const res = await request(app).get('/api/payments/notifications');
    expect(res.status).toBe(200); expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/payments/parse-test', () => {
  it('parses JazzCash email', async () => {
    const res = await request(app).post('/api/payments/parse-test').send({ from: 'jc@test.com', subject: 'Payment', body: 'Rs.1800 TXN:123' });
    expect(res.status).toBe(200); expect(res.body).toHaveProperty('parsed'); expect(res.body.parsed.type).toBe('JAZZCASH');
  });
  it('works with empty body', async () => {
    const res = await request(app).post('/api/payments/parse-test').send({});
    expect(res.status).toBe(200); expect(res.body).toHaveProperty('parsed');
  });
});

describe('POST /api/payments/verify', () => {
  it('verifies valid payment', async () => {
    verifyPaymentNotification.mockResolvedValue({ success: true, message: 'Verified', orderId: 'O1' });
    const res = await request(app).post('/api/payments/verify').send({ txnId: 'TXN123', amount: 1800 });
    expect(res.status).toBe(200); expect(res.body.success).toBe(true);
  });
  it('returns 202 when not matched', async () => {
    verifyPaymentNotification.mockResolvedValue({ success: false, message: 'Not found' });
    const res = await request(app).post('/api/payments/verify').send({ txnId: 'TXN999' });
    expect(res.status).toBe(202);
  });
});

describe('POST /api/payments/manual-verify', () => {
  it('manually verifies transaction', async () => {
    manualVerifyTransaction.mockResolvedValue({ success: true, message: 'Done' });
    const res = await request(app).post('/api/payments/manual-verify').send({ transactionId: 'TXN123', orderId: 'O1' });
    expect(res.status).toBe(200); expect(res.body.success).toBe(true);
  });
});