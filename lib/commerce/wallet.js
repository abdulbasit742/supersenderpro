// lib/commerce/wallet.js
// Customer Wallet / Store Credit engine for SuperSender Pro.
// Decoupled, JSON-backed, tenant-scoped. No edits to server.js required.
// Wire via docs note. AI-free: pure deterministic ledger.

import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.SS_DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'wallets.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ wallets: {}, ledger: [] }, null, 2));
}

function load() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { wallets: {}, ledger: [] }; }
}

function save(db) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function key(tenantId, contactId) {
  if (!tenantId) throw new Error('tenantId required');
  if (!contactId) throw new Error('contactId required');
  return `${tenantId}::${contactId}`;
}

export function getBalance(tenantId, contactId) {
  const db = load();
  return db.wallets[key(tenantId, contactId)]?.balance || 0;
}

function record(db, tenantId, contactId, type, amount, meta) {
  db.ledger.push({
    id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tenantId, contactId, type, amount,
    balanceAfter: db.wallets[key(tenantId, contactId)].balance,
    meta: meta || {},
    at: new Date().toISOString()
  });
}

export function credit(tenantId, contactId, amount, meta) {
  amount = Number(amount);
  if (!(amount > 0)) throw new Error('amount must be > 0');
  const db = load();
  const k = key(tenantId, contactId);
  if (!db.wallets[k]) db.wallets[k] = { tenantId, contactId, balance: 0 };
  db.wallets[k].balance += amount;
  record(db, tenantId, contactId, 'credit', amount, meta);
  save(db);
  return db.wallets[k].balance;
}

export function debit(tenantId, contactId, amount, meta) {
  amount = Number(amount);
  if (!(amount > 0)) throw new Error('amount must be > 0');
  const db = load();
  const k = key(tenantId, contactId);
  const bal = db.wallets[k]?.balance || 0;
  if (bal < amount) {
    const err = new Error('insufficient funds');
    err.code = 'INSUFFICIENT_FUNDS';
    err.balance = bal;
    throw err;
  }
  db.wallets[k].balance -= amount;
  record(db, tenantId, contactId, 'debit', amount, meta);
  save(db);
  return db.wallets[k].balance;
}

// Convenience: apply wallet against an order total, returns { applied, remainingDue }.
export function applyToOrder(tenantId, contactId, orderTotal, meta) {
  orderTotal = Number(orderTotal) || 0;
  const bal = getBalance(tenantId, contactId);
  const applied = Math.min(bal, orderTotal);
  if (applied > 0) debit(tenantId, contactId, applied, { reason: 'order', ...meta });
  return { applied, remainingDue: orderTotal - applied, walletBalance: getBalance(tenantId, contactId) };
}

export function ledger(tenantId, contactId, limit = 50) {
  const db = load();
  return db.ledger
    .filter(t => t.tenantId === tenantId && (!contactId || t.contactId === contactId))
    .slice(-limit)
    .reverse();
}

export default { getBalance, credit, debit, applyToOrder, ledger };
