// lib/orders/orderEngine.js — Core order lifecycle. create() builds an order from line items with
// computed totals (coupon-aware via #59); place() moves draft->pending; transition() enforces the
// allowed status flow; markPaid() links a payment + redeems the coupon (#59) + records customer-360
// (#46); fulfill/deliver/cancel/refund are guarded transitions. Status changes fire a (draft-only)
// customer message. Never charges — payments #1 owns money movement.

const store = require('./store');
const { config, STATUSES, TRANSITIONS } = require('./config');
const totals = require('./totals');
const notify = require('./notify');
const { maskContact } = require('./privacy');

let coupons = null; try { coupons = require('../coupons'); } catch (_e) { coupons = null; }
let c360 = null; try { c360 = require('../customer360'); } catch (_e) { c360 = null; }
let analytics = null; try { analytics = require('../analytics'); } catch (_e) { analytics = null; }

function publicView(o) {
 if (!o) return null;
 return {
 id: o.id, number: o.number, status: o.status, contactMasked: o.contact ? maskContact(o.contact) : null, name: o.name || '',
 lines: o.lines, subtotal: o.subtotal, discount: o.discount, couponApplied: o.couponApplied || null,
 tax: o.tax, shipping: o.shipping, total: o.total, currency: o.currency,
 paymentRef: o.paymentRef || null, notes: o.notes || '',
 createdAt: o.createdAt, updatedAt: o.updatedAt, history: o.history || [],
 };
}

function create({ contact, name = '', items, couponCode, notes = '', taxPercent, shippingFlat } = {}) {
 if (!Array.isArray(items) || !items.length) throw new Error('at least one line item is required');
 const t = totals.compute({ items, couponCode, contact, taxPercent, shippingFlat });
 const now = store.nowIso();
 const d = store.load();
 const o = {
 id: store.genId('ord'), number: store.nextOrderNumber(),
 contact: contact ? String(contact) : null, name: String(name || ''),
 lines: t.lines, subtotal: t.subtotal, discount: t.discount, couponApplied: t.couponApplied, couponError: t.couponError,
 freeShipping: t.freeShipping, taxPercent: t.taxPercent, tax: t.tax, shipping: t.shipping, total: t.total, currency: t.currency,
 status: 'draft', paymentRef: null, notes: String(notes || ''),
 history: [{ status: 'draft', at: now }], createdAt: now, updatedAt: now,
 };
 d.orders.push(o); store.save(d);
 return publicView(o);
}

function _get(d, id) { return d.orders.find((o) => o.id === id || o.number === id); }

async function _applyStatus(o, status, extra = {}) {
 const now = store.nowIso();
 o.status = status; o.updatedAt = now; o.history.push({ status, at: now, ...extra });
}

function _canTransition(from, to) { return (TRANSITIONS[from] || []).includes(to); }

async function place(id) {
 const d = store.load(); const o = _get(d, id);
 if (!o) throw new Error('order not found');
 if (o.status !== 'draft') return { ok: false, reason: 'only draft orders can be placed', status: o.status };
 await _applyStatus(o, 'pending');
 store.save(d);
 const msg = `Order ${o.number} placed. Total ${o.currency} ${o.total}. We'll confirm once payment is received.`;
 const res = await notify.dispatch(o.contact, msg, { kind: 'order_placed', orderId: o.id });
 if (analytics) { try { analytics.track({ event: 'order.placed', value: o.total, dimensions: { currency: o.currency } }); } catch (_e) { /* ignore */ } }
 return { ok: true, order: publicView(o), message: { sent: res.sent, draft: !res.sent, preview: res.preview || msg } };
}

// Mark an order paid: link the payment ref, redeem the coupon (idempotent via #59), record 360.
async function markPaid(id, { paymentRef, redeemCoupon = true } = {}) {
 const d = store.load(); const o = _get(d, id);
 if (!o) throw new Error('order not found');
 if (!_canTransition(o.status, 'paid')) return { ok: false, reason: `cannot move ${o.status} -> paid` };
 o.paymentRef = paymentRef ? String(paymentRef) : (o.paymentRef || null);
 await _applyStatus(o, 'paid', { paymentRef: o.paymentRef });
 store.save(d);
 // Redeem the coupon now that the order is actually paid (idempotent per code+orderId in #59).
 if (redeemCoupon && o.couponApplied && coupons) {
 try { coupons.redeem({ code: o.couponApplied, amount: o.subtotal, contact: o.contact, orderId: o.id }); } catch (_e) { /* non-fatal */ }
 }
 if (c360 && o.contact) { try { c360.track({ contact: o.contact, type: 'payment', meta: { order: o.number, amount: o.total } }); } catch (_e) { /* ignore */ } }
 if (analytics) { try { analytics.track({ event: 'order.paid', value: o.total, dimensions: { currency: o.currency } }); } catch (_e) { /* ignore */ } }
 const msg = `Payment received for order ${o.number}. Thank you! We're preparing your order.`;
 const res = await notify.dispatch(o.contact, msg, { kind: 'order_paid', orderId: o.id });
 return { ok: true, order: publicView(o), message: { sent: res.sent, draft: !res.sent, preview: res.preview || msg } };
}

async function transition(id, to, extra = {}) {
 if (!STATUSES.includes(to)) throw new Error('invalid status');
 const d = store.load(); const o = _get(d, id);
 if (!o) throw new Error('order not found');
 if (!_canTransition(o.status, to)) return { ok: false, reason: `cannot move ${o.status} -> ${to}` };
 await _applyStatus(o, to, extra);
 store.save(d);
 const labels = { fulfilled: 'is being prepared/shipped', delivered: 'has been delivered', cancelled: 'has been cancelled', refunded: 'has been refunded' };
 const msg = `Update on order ${o.number}: it ${labels[to] || ('is now ' + to)}.`;
 const res = await notify.dispatch(o.contact, msg, { kind: 'order_' + to, orderId: o.id });
 if (analytics) { try { analytics.track({ event: 'order.' + to, value: o.total, dimensions: { currency: o.currency } }); } catch (_e) { /* ignore */ } }
 return { ok: true, order: publicView(o), message: { sent: res.sent, draft: !res.sent, preview: res.preview || msg } };
}

const fulfill = (id) => transition(id, 'fulfilled');
const deliver = (id) => transition(id, 'delivered');
const cancel = (id, reason = '') => transition(id, 'cancelled', { reason: String(reason || '') });
const refund = (id, reason = '') => transition(id, 'refunded', { reason: String(reason || '') });

function list({ status, contact, limit = 200 } = {}) {
 let items = store.load().orders.slice();
 if (status) items = items.filter((o) => o.status === status);
 if (contact) items = items.filter((o) => String(o.contact || '') === String(contact));
 return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit).map(publicView);
}
function get(id) { return publicView(_get(store.load(), id)); }

function overview() {
 const d = store.load();
 const by = (s) => d.orders.filter((o) => o.status === s).length;
 const revenue = d.orders.filter((o) => ['paid', 'fulfilled', 'delivered'].includes(o.status)).reduce((s, o) => s + (Number(o.total) || 0), 0);
 return {
 generatedAt: store.nowIso(), liveMessages: config.liveMessages,
 cards: {
 total: d.orders.length, draft: by('draft'), pending: by('pending'), paid: by('paid'),
 fulfilled: by('fulfilled'), delivered: by('delivered'), cancelled: by('cancelled'), refunded: by('refunded'),
 recognizedRevenue: Math.round(revenue * 100) / 100, currency: config.defaultCurrency,
 },
 };
}

module.exports = { create, place, markPaid, transition, fulfill, deliver, cancel, refund, list, get, overview, publicView };
