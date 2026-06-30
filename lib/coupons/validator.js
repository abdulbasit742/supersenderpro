// lib/coupons/validator.js — Validate a coupon against an order context WITHOUT redeeming it, and
// compute the discount. Checks: exists, active, within validity window, min-spend met, global +
// per-contact usage caps not exceeded. Returns { ok, reason?, discount, finalAmount, coupon }.
// Pure read over the store (per-contact usage counted from the redemption ledger).

const store = require('./store');
const couponStore = require('./couponStore');

function _round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function _perContactCount(code, contact) {
 if (!contact) return 0;
 return store.load().redemptions.filter((r) => r.code === code && String(r.contact) === String(contact)).length;
}

function _computeDiscount(coupon, amount) {
 if (coupon.type === 'percent') return _round2(amount * (coupon.value / 100));
 if (coupon.type === 'fixed') return _round2(Math.min(coupon.value, amount));
 return 0; // free_shipping: discount on goods is 0 (shipping handled by caller)
}

function validate({ code, amount = 0, contact, refNow = Date.now() } = {}) {
 const c = couponStore.rawByCode(code);
 if (!c) return { ok: false, reason: 'unknown code' };
 if (c.active === false) return { ok: false, reason: 'coupon inactive' };
 if (c.startsAt && Date.parse(c.startsAt) > refNow) return { ok: false, reason: 'not yet valid' };
 if (c.expiresAt && Date.parse(c.expiresAt) < refNow) return { ok: false, reason: 'expired' };
 const amt = Number(amount) || 0;
 if (c.minSpend && amt < c.minSpend) return { ok: false, reason: `minimum spend ${c.currency} ${c.minSpend} not met` };
 if (c.maxRedemptions && (c.redeemedCount || 0) >= c.maxRedemptions) return { ok: false, reason: 'redemption limit reached' };
 if (c.perContactLimit && _perContactCount(c.code, contact) >= c.perContactLimit) return { ok: false, reason: 'per-customer limit reached' };
 const discount = _computeDiscount(c, amt);
 return {
 ok: true, code: c.code, type: c.type, currency: c.currency,
 discount, finalAmount: _round2(Math.max(0, amt - discount)),
 freeShipping: c.type === 'free_shipping', coupon: couponStore.publicView(c),
 };
}

module.exports = { validate, _computeDiscount };
