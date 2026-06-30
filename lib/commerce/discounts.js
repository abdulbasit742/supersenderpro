'use strict';
/**
 * discounts.js — Commerce Feature #5: discount / coupon codes.
 *
 * Promos drive sales: "SAVE10", "EID500". This creates codes (percent or flat amount), enforces the
 * rules that stop abuse (min order, total usage cap, per-customer cap, expiry), and applies them to
 * an order total. validate() is a dry check; apply() records the redemption.
 *
 * Storage: JSON (data/discounts.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'discounts.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { codes: [], redemptions: [] }; }
  catch { return { codes: [], redemptions: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();
const nowIso = () => new Date().toISOString();
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const normCode = (c) => String(c || '').trim().toUpperCase();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

/**
 * Create a discount code.
 * @param {Object} opts { code, type:'percent'|'flat', value, minOrder?, maxUses?, perCustomer?, expiresAt? }
 */
function createCode(opts = {}) {
  const code = normCode(opts.code);
  if (!code) throw new Error('code required');
  if (!['percent', 'flat'].includes(opts.type)) throw new Error("type must be 'percent' or 'flat'");
  if (!(Number(opts.value) > 0)) throw new Error('value must be > 0');
  const data = load();
  if (data.codes.some(c => c.code === code)) throw new Error('code already exists');
  const c = {
    code,
    type: opts.type,
    value: Number(opts.value),
    minOrder: Number(opts.minOrder || 0),
    maxUses: opts.maxUses != null ? Number(opts.maxUses) : null,    // null = unlimited
    perCustomer: opts.perCustomer != null ? Number(opts.perCustomer) : null,
    expiresAt: opts.expiresAt ? new Date(opts.expiresAt).getTime() : null,
    active: opts.active !== false,
    uses: 0,
    createdAt: nowIso()
  };
  data.codes.push(c);
  save(data);
  return c;
}

function getCode(code) { return load().codes.find(c => c.code === normCode(code)) || null; }
function listCodes() { return load().codes; }

function redemptionsBy(data, code, phone) {
  return data.redemptions.filter(r => r.code === code && (!phone || r.phone === phone)).length;
}

/**
 * Validate a code against an order (amount + customer). Returns { ok, reason?, discount, total }.
 */
function validate(code, { amount = 0, customerPhone } = {}) {
  const c = getCode(code);
  if (!c || !c.active) return { ok: false, reason: 'invalid code' };
  if (c.expiresAt && nowMs() > c.expiresAt) return { ok: false, reason: 'expired' };
  if (amount < c.minOrder) return { ok: false, reason: `minimum order ${c.minOrder}` };
  const data = load();
  if (c.maxUses != null && c.uses >= c.maxUses) return { ok: false, reason: 'usage limit reached' };
  if (c.perCustomer != null && customerPhone && redemptionsBy(data, c.code, normPhone(customerPhone)) >= c.perCustomer) {
    return { ok: false, reason: 'already used by this customer' };
  }
  const discount = c.type === 'percent' ? round2(amount * (c.value / 100)) : round2(Math.min(c.value, amount));
  return { ok: true, discount, total: round2(Math.max(0, amount - discount)), code: c.code, type: c.type, value: c.value };
}

/** Apply (record redemption). Re-validates first. */
function apply(code, { amount = 0, customerPhone, orderId } = {}) {
  const v = validate(code, { amount, customerPhone });
  if (!v.ok) return v;
  const data = load();
  const c = data.codes.find(x => x.code === normCode(code));
  c.uses += 1;
  data.redemptions.push({ code: c.code, phone: normPhone(customerPhone), orderId: orderId || null, discount: v.discount, at: nowIso() });
  save(data);
  return { ...v, applied: true };
}

function deactivate(code) {
  const data = load();
  const c = data.codes.find(x => x.code === normCode(code));
  if (!c) return null;
  c.active = false;
  save(data);
  return c;
}

module.exports = { createCode, getCode, listCodes, validate, apply, deactivate };
