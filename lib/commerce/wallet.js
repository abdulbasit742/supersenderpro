'use strict';
/**
 * wallet.js — Commerce Feature #6: customer wallet / store credit.
 *
 * Lets a business hold store credit for a customer (refunds, prepaid top-ups, loyalty cash-back).
 * A per-contact balance with a full ledger; credit() adds, debit() spends (blocked if insufficient).
 * Refunds become wallet credit, top-ups add balance, and orders can pay partly/fully from it.
 *
 * Storage: JSON (data/wallets.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'wallets.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { wallets: {} }; }
  catch { return { wallets: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function ensureWallet(data, phone) {
  if (!data.wallets[phone]) data.wallets[phone] = { phone, balance: 0, currency: 'PKR', ledger: [], createdAt: nowIso() };
  return data.wallets[phone];
}

function getWallet(phone) {
  const w = load().wallets[normPhone(phone)];
  return w || { phone: normPhone(phone), balance: 0, currency: 'PKR', ledger: [] };
}

function credit(phone, amount, opts = {}) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  const amt = round2(amount);
  if (amt <= 0) throw new Error('amount must be > 0');
  const data = load();
  const w = ensureWallet(data, p);
  w.balance = round2(w.balance + amt);
  w.ledger.push({ type: 'credit', amount: amt, reason: opts.reason || 'credit', ref: opts.ref || null, at: nowIso(), balance: w.balance });
  if (w.ledger.length > 1000) w.ledger = w.ledger.slice(-1000);
  save(data);
  return w;
}

function debit(phone, amount, opts = {}) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  const amt = round2(amount);
  if (amt <= 0) throw new Error('amount must be > 0');
  const data = load();
  const w = ensureWallet(data, p);
  if (w.balance < amt) return { ok: false, error: 'insufficient balance', balance: w.balance };
  w.balance = round2(w.balance - amt);
  w.ledger.push({ type: 'debit', amount: -amt, reason: opts.reason || 'spend', ref: opts.ref || null, at: nowIso(), balance: w.balance });
  save(data);
  return { ok: true, wallet: w };
}

/** Apply wallet toward an order total; returns how much was used + remaining to pay. */
function applyToOrder(phone, orderTotal, opts = {}) {
  const w = getWallet(phone);
  const use = round2(Math.min(w.balance, Number(orderTotal) || 0));
  if (use <= 0) return { used: 0, remainingToPay: round2(orderTotal), walletBalance: w.balance };
  const r = debit(phone, use, { reason: 'order payment', ref: opts.orderId });
  return { used: use, remainingToPay: round2((Number(orderTotal) || 0) - use), walletBalance: r.ok ? r.wallet.balance : w.balance };
}

function ledger(phone, limit = 50) {
  const w = getWallet(phone);
  return w.ledger.slice(-Math.max(1, Number(limit) || 50)).reverse();
}

module.exports = { getWallet, credit, debit, applyToOrder, ledger };
