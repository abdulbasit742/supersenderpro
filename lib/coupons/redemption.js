// lib/coupons/redemption.js — Apply (redeem) a coupon: validate atomically, then record a
// redemption in the ledger and bump the coupon's count. Idempotent per (code + orderId) so a
// retried checkout doesn't double-count. Returns the discount result + a redemption id. Records a
// customer-360 #46 event + a coupon.redeemed analytics #9 event when those depts are present.

const store = require('./store');
const { config } = require('./config');
const couponStore = require('./couponStore');
const validator = require('./validator');
const { maskContact } = require('./privacy');

let c360 = null; try { c360 = require('../customer360'); } catch (_e) { c360 = null; }
let analytics = null; try { analytics = require('../analytics'); } catch (_e) { analytics = null; }

// redeem({ code, amount, contact, orderId }) -> { redeemed, ... }
function redeem({ code, amount = 0, contact, orderId } = {}, refNow = Date.now()) {
 const d = store.load();
 const c = couponStore.rawByCode(code);
 if (!c) return { redeemed: false, reason: 'unknown code' };

 // Idempotency: same code + orderId already redeemed -> return the prior result.
 if (orderId) {
 const prior = d.redemptions.find((r) => r.code === c.code && r.orderId === String(orderId));
 if (prior) return { redeemed: true, idempotent: true, redemptionId: prior.id, discount: prior.discount, finalAmount: prior.finalAmount };
 }

 // Validate atomically against the latest store state.
 const v = validator.validate({ code, amount, contact, refNow });
 if (!v.ok) return { redeemed: false, reason: v.reason };

 const rec = {
 id: store.genId('rdm'), code: c.code, couponId: c.id,
 contact: contact ? String(contact) : null, contactMasked: maskContact(contact),
 orderId: orderId ? String(orderId) : null,
 amount: Number(amount) || 0, discount: v.discount, finalAmount: v.finalAmount,
 type: c.type, currency: c.currency, at: new Date(refNow).toISOString(),
 };
 d.redemptions.push(rec);
 const raw = d.coupons.find((x) => x.id === c.id);
 if (raw) raw.redeemedCount = (raw.redeemedCount || 0) + 1;
 store.save(d);

 if (c360 && contact) { try { c360.track({ contact, type: 'custom', meta: { event: 'coupon_redeemed', code: c.code, discount: v.discount } }); } catch (_e) { /* ignore */ } }
 if (analytics) { try { analytics.track({ event: 'coupon.redeemed', value: v.discount, dimensions: { type: c.type } }); } catch (_e) { /* ignore */ } }

 return { redeemed: true, redemptionId: rec.id, discount: v.discount, finalAmount: v.finalAmount, freeShipping: v.freeShipping, code: c.code };
}

function ledger({ code, contact, limit = 200 } = {}) {
 let items = store.load().redemptions.slice();
 if (code) items = items.filter((r) => r.code === couponStore._normCode(code));
 if (contact) items = items.filter((r) => String(r.contact || '') === String(contact));
 return items.slice(-limit).reverse().map((r) => ({ id: r.id, code: r.code, contactMasked: r.contactMasked, orderId: r.orderId, amount: r.amount, discount: r.discount, finalAmount: r.finalAmount, at: r.at }));
}

function stats(code) {
 const c = couponStore.rawByCode(code);
 if (!c) return null;
 const rds = store.load().redemptions.filter((r) => r.code === c.code);
 const totalDiscount = rds.reduce((s, r) => s + (Number(r.discount) || 0), 0);
 const uniqueContacts = new Set(rds.map((r) => r.contactMasked).filter(Boolean)).size;
 return { code: c.code, redemptions: rds.length, uniqueContacts, totalDiscount: Math.round(totalDiscount * 100) / 100, currency: c.currency, remaining: c.maxRedemptions ? Math.max(0, c.maxRedemptions - (c.redeemedCount || 0)) : null };
}

module.exports = { redeem, ledger, stats };
