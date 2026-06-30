// lib/orders/totals.js — Pure order math. Computes line totals, subtotal, coupon discount (via
// lib/coupons #59 when present, else a local percent/fixed fallback), tax on the discounted
// subtotal, shipping (waived on free_shipping), and the grand total. No side effects.

const { config } = require('./config');

let coupons = null; try { coupons = require('../coupons'); } catch (_e) { coupons = null; }

function _round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function lineItems(items) {
 return (Array.isArray(items) ? items : []).map((li) => {
 const qty = Number(li.qty) > 0 ? Number(li.qty) : 1;
 const unitPrice = Number(li.unitPrice) || 0;
 return { sku: li.sku ? String(li.sku) : null, name: String(li.name || 'Item'), qty, unitPrice: _round2(unitPrice), lineTotal: _round2(qty * unitPrice) };
 });
}

// compute({ items, couponCode?, contact?, taxPercent?, shippingFlat? }) -> totals breakdown.
function compute({ items, couponCode, contact, taxPercent, shippingFlat } = {}) {
 const lines = lineItems(items);
 const subtotal = _round2(lines.reduce((s, li) => s + li.lineTotal, 0));
 let discount = 0; let freeShipping = false; let couponApplied = null; let couponError = null;
 if (couponCode) {
 if (coupons) {
 const v = coupons.validate({ code: couponCode, amount: subtotal, contact });
 if (v.ok) { discount = _round2(v.discount); freeShipping = !!v.freeShipping; couponApplied = v.code; }
 else { couponError = v.reason; }
 } else {
 couponError = 'coupons module not present';
 }
 }
 const discountedSubtotal = _round2(Math.max(0, subtotal - discount));
 const taxPct = taxPercent !== undefined ? Number(taxPercent) : config.taxPercent;
 const tax = _round2(discountedSubtotal * (taxPct / 100));
 let shipping = shippingFlat !== undefined ? Number(shippingFlat) : config.shippingFlat;
 if (freeShipping) shipping = 0;
 shipping = _round2(shipping);
 const total = _round2(discountedSubtotal + tax + shipping);
 return { currency: config.defaultCurrency, lines, subtotal, discount, couponApplied, couponError, freeShipping, taxPercent: taxPct, tax, shipping, total };
}

module.exports = { compute, lineItems, _round2 };
