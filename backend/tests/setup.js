process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_supersender_12345';
process.env.PORT = '3099';

const mockPrisma = {
  user:     { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
  customer: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  businessOrder: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
  stockItem: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
  dealer:   { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
  rateSnapshot: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
  rateEntry: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
  paymentNotification: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  saleRecord: { findMany: jest.fn(), create: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  auditLog:   { create: jest.fn(), findMany: jest.fn() },
  adminAlert: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  sale:     { findMany: jest.fn(), create: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  purchase: { findMany: jest.fn(), create: jest.fn() },
};

mockPrisma['$disconnect'] = jest.fn();
mockPrisma['$transaction'] = jest.fn((fn) => fn());

jest.mock('../src/services/prisma', () => mockPrisma);