// lib/coupons/couponStore.js — Create + manage discount codes. A coupon:
// { id, code, type(percent|fixed|free_shipping), value, currency, minSpend, maxRedemptions,
//   perContactLimit, startsAt, expiresAt, active, redeemedCount }. Codes are case-insensitive +
// unique. Coupons are deactivated, never hard-deleted.

const store = require('./store');
const { config, TYPES } = require('./config');
const codeGen = require('./codeGen');

function _normCode(c) { return String(c || '').trim().toUpperCase(); }

function publicView(c) {
 if (!c) return null;
 return { id: c.id, code: c.code, type: c.type, value: c.value, currency: c.currency, minSpend: c.minSpend || 0, maxRedemptions: c.maxRedemptions || null, perContactLimit: c.perContactLimit || null, startsAt: c.startsAt || null, expiresAt: c.expiresAt || null, active: c.active !== false, redeemedCount: c.redeemedCount || 0, createdAt: c.createdAt };
}

function create({ code, type = 'percent', value, currency, minSpend = 0, maxRedemptions, perContactLimit, startsAt, expiresAt, prefix } = {}) {
 if (!TYPES.includes(type)) throw new Error('type must be one of: ' + TYPES.join(', '));
 if (type !== 'free_shipping') {
 const v = Number(value);
 if (!(v > 0)) throw new Error('value must be > 0');
 if (type === 'percent' && v > 100) throw new Error('percent value cannot exceed 100');
 }
 if (startsAt && Number.isNaN(Date.parse(startsAt))) throw new Error('invalid startsAt');
 if (expiresAt && Number.isNaN(Date.parse(expiresAt))) throw new Error('invalid expiresAt');
 const d = store.load();
 let theCode = code ? _normCode(code) : codeGen.generate(config.codeLength, prefix);
 let guard = 0; while (d.coupons.some((c) => c.code === theCode) && guard < 20) { theCode = codeGen.generate(config.codeLength, prefix); guard += 1; }
 if (d.coupons.some((c) => c.code === theCode)) throw new Error('code already exists');
 const c = {
 id: store.genId('cpn'), code: theCode, type,
 value: type === 'free_shipping' ? 0 : Number(value), currency: currency || config.defaultCurrency,
 minSpend: Number(minSpend) > 0 ? Number(minSpend) : 0,
 maxRedemptions: Number(maxRedemptions) > 0 ? Number(maxRedemptions) : null,
 perContactLimit: Number(perContactLimit) > 0 ? Number(perContactLimit) : null,
 startsAt: startsAt || null, expiresAt: expiresAt || null, active: true,
 redeemedCount: 0, createdAt: store.nowIso(),
 };
 d.coupons.push(c); store.save(d);
 return publicView(c);
}

function _get(d, code) { return d.coupons.find((c) => c.code === _normCode(code)); }
function getByCode(code) { return publicView(_get(store.load(), code)); }
function rawByCode(code) { return _get(store.load(), code) || null; }
function all() { return store.load().coupons.map(publicView); }
function setActive(id, active) { const d = store.load(); const c = d.coupons.find((x) => x.id === id); if (!c) throw new Error('coupon not found'); c.active = !!active; store.save(d); return publicView(c); }

// Bulk-generate N single-use codes sharing the same discount config (e.g. for a giveaway).
function bulkGenerate(n, opts = {}) {
 const count = Math.min(Number(n) || 0, config.maxBulkGenerate);
 if (count <= 0) throw new Error('count must be 1..' + config.maxBulkGenerate);
 const created = [];
 for (let i = 0; i < count; i++) created.push(create({ ...opts, code: undefined, maxRedemptions: opts.maxRedemptions || 1 }));
 return created;
}

module.exports = { create, getByCode, rawByCode, all, setActive, bulkGenerate, publicView, _normCode };
