'use strict';
/**
 * AI Coupon / Discount Code Engine
 * - Deterministic core: create, validate, redeem coupons. Works with NO model.
 * - Ollama only phrases a friendly promo/offer message (graceful template fallback).
 * - Zero new npm deps. Node built-ins + global fetch only.
 * - File-backed per-tenant storage under data/coupons/<tenantId>.json
 * - Tenant-scoped: missing tenantId throws.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'coupons');

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function reqTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantId is required');
  }
  return tenantId;
}

function filePath(tenantId) {
  return path.join(DATA_DIR, `${reqTenant(tenantId)}.json`);
}

function load(tenantId) {
  ensureDir();
  const fp = filePath(tenantId);
  if (!fs.existsSync(fp)) return { coupons: {} };
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8')) || { coupons: {} };
  } catch {
    return { coupons: {} };
  }
}

function save(tenantId, state) {
  ensureDir();
  fs.writeFileSync(filePath(tenantId), JSON.stringify(state, null, 2));
}

function normCode(code) {
  return String(code || '').trim().toUpperCase();
}

/**
 * Create or upsert a coupon.
 * opts: { code, type:'percent'|'fixed', value, minOrder, maxUses, perCustomer, startsAt, expiresAt, active, currency }
 */
function createCoupon(tenantId, opts = {}) {
  reqTenant(tenantId);
  const code = normCode(opts.code);
  if (!code) throw new Error('coupon code is required');
  const type = opts.type === 'fixed' ? 'fixed' : 'percent';
  const value = Number(opts.value);
  if (!Number.isFinite(value) || value <= 0) throw new Error('value must be > 0');
  if (type === 'percent' && value > 100) throw new Error('percent value cannot exceed 100');

  const state = load(tenantId);
  const existing = state.coupons[code] || {};
  const coupon = {
    code,
    type,
    value,
    minOrder: opts.minOrder != null ? Number(opts.minOrder) : 0,
    maxUses: opts.maxUses != null ? Number(opts.maxUses) : null,
    perCustomer: opts.perCustomer != null ? Number(opts.perCustomer) : null,
    startsAt: opts.startsAt || null,
    expiresAt: opts.expiresAt || null,
    active: opts.active !== false,
    currency: opts.currency || 'PKR',
    uses: existing.uses || 0,
    byCustomer: existing.byCustomer || {},
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.coupons[code] = coupon;
  save(tenantId, state);
  return coupon;
}

function getCoupon(tenantId, code) {
  const state = load(tenantId);
  return state.coupons[normCode(code)] || null;
}

function listCoupons(tenantId) {
  const state = load(tenantId);
  return Object.values(state.coupons);
}

function _now(at) {
  return at ? new Date(at).getTime() : Date.now();
}

/**
 * Validate a coupon against an order. Pure/deterministic.
 * ctx: { orderTotal, customerId, at }
 * returns { ok, reason, coupon, discount, finalTotal }
 */
function validateCoupon(tenantId, code, ctx = {}) {
  reqTenant(tenantId);
  const coupon = getCoupon(tenantId, code);
  if (!coupon) return { ok: false, reason: 'not_found' };
  if (!coupon.active) return { ok: false, reason: 'inactive', coupon };

  const now = _now(ctx.at);
  if (coupon.startsAt && now < new Date(coupon.startsAt).getTime()) {
    return { ok: false, reason: 'not_started', coupon };
  }
  if (coupon.expiresAt && now > new Date(coupon.expiresAt).getTime()) {
    return { ok: false, reason: 'expired', coupon };
  }
  if (coupon.maxUses != null && coupon.uses >= coupon.maxUses) {
    return { ok: false, reason: 'max_uses_reached', coupon };
  }
  if (coupon.perCustomer != null && ctx.customerId) {
    const used = coupon.byCustomer[ctx.customerId] || 0;
    if (used >= coupon.perCustomer) {
      return { ok: false, reason: 'per_customer_limit', coupon };
    }
  }
  const orderTotal = Number(ctx.orderTotal);
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
    return { ok: false, reason: 'invalid_order_total', coupon };
  }
  if (coupon.minOrder && orderTotal < coupon.minOrder) {
    return { ok: false, reason: 'below_min_order', coupon };
  }

  let discount = coupon.type === 'percent'
    ? (orderTotal * coupon.value) / 100
    : coupon.value;
  discount = Math.min(discount, orderTotal);
  discount = Math.round(discount * 100) / 100;
  const finalTotal = Math.round((orderTotal - discount) * 100) / 100;
  return { ok: true, reason: 'valid', coupon, discount, finalTotal };
}

/**
 * Redeem (commits a use). Validates first, then increments counters atomically per-file.
 */
function redeemCoupon(tenantId, code, ctx = {}) {
  reqTenant(tenantId);
  const check = validateCoupon(tenantId, code, ctx);
  if (!check.ok) return check;
  const state = load(tenantId);
  const c = state.coupons[normCode(code)];
  c.uses = (c.uses || 0) + 1;
  if (ctx.customerId) {
    c.byCustomer[ctx.customerId] = (c.byCustomer[ctx.customerId] || 0) + 1;
  }
  c.updatedAt = new Date().toISOString();
  save(tenantId, state);
  return { ...check, redeemed: true, usesRemaining: c.maxUses != null ? c.maxUses - c.uses : null };
}

function deactivateCoupon(tenantId, code) {
  reqTenant(tenantId);
  const state = load(tenantId);
  const c = state.coupons[normCode(code)];
  if (!c) return null;
  c.active = false;
  c.updatedAt = new Date().toISOString();
  save(tenantId, state);
  return c;
}

// ---- AI phrasing (optional, graceful fallback) ----
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:32b';

function templateOffer(coupon, lang) {
  const off = coupon.type === 'percent'
    ? `${coupon.value}% off`
    : `${coupon.value} ${coupon.currency} off`;
  const min = coupon.minOrder ? ` (min order ${coupon.minOrder} ${coupon.currency})` : '';
  if (lang === 'ur') {
    return `\u062e\u0648\u0634\u062e\u0628\u0631\u06cc! Code *${coupon.code}* use karein aur payen ${off}${min}.`;
  }
  return `Good news! Use code *${coupon.code}* to get ${off}${min}.`;
}

async function phraseOffer(coupon, opts = {}) {
  const fallback = templateOffer(coupon, opts.lang);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Number(opts.timeoutMs || 2500));
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        prompt: `Write one short, friendly WhatsApp promo line for this coupon. Keep under 160 chars, no markdown headings.\nCoupon: ${JSON.stringify({ code: coupon.code, type: coupon.type, value: coupon.value, minOrder: coupon.minOrder, currency: coupon.currency })}\nLanguage: ${opts.lang || 'en'}`
      })
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const text = (data && data.response ? String(data.response) : '').trim();
    return text || fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(t);
  }
}

module.exports = {
  createCoupon,
  getCoupon,
  listCoupons,
  validateCoupon,
  redeemCoupon,
  deactivateCoupon,
  phraseOffer,
  templateOffer,
  _normCode: normCode
};
