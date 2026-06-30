'use strict';

/**
 * Ecommerce Hub — ORDER PIPELINE ORCHESTRATOR.
 * The single brain that ties the 90+ modules into one flow. Instead of calling
 * each feature separately, a platform webhook hits ONE entry and the whole
 * lifecycle runs in order. Every step is wrapped (safe()) so one failure never
 * breaks the chain. Everything is dry-run safe (no sends until enabled).
 *
 *   ingest(order)  : new order -> admin notify -> RTO risk -> COD confirm (OTP if high risk)
 *                    -> loyalty award -> timeline -> contact upsert -> referral (if code)
 *   ship(rec)      : set tracking -> status "shipped" -> timeline
 *   deliver(rec)   : status "delivered" -> POD (if given) -> review + NPS -> reorder enroll -> timeline
 *
 * Each sub-module is required defensively so a missing file can't crash the run.
 */

function opt(p) { try { return require('./' + p); } catch (_e) { return null; } }

const notify        = opt('orderNotify');
const cod           = opt('codStore');
const codOtp        = opt('codOtp');
const risk          = opt('riskScore');
const loyalty       = opt('loyalty');
const timeline      = opt('orderTimeline');
const contacts      = opt('optOutStore');
const referral      = opt('referral');
const tracking      = opt('tracking');
const orderStatus   = opt('orderStatus');
const deliveryProof = opt('deliveryProof');
const reviews       = opt('reviews');
const nps           = opt('nps');
const reorder       = opt('reorder');
const subscriptions = opt('subscriptions');

async function safe(name, fn) {
  try { const r = await fn(); return { step: name, ok: true, result: r }; }
  catch (e) { return { step: name, ok: false, error: e && e.message }; }
}

function isCod(o) { const m = String(o.paymentMethod || o.payment || '').toLowerCase(); return o.cod === true || m.indexOf('cod') !== -1 || m.indexOf('cash') !== -1; }

/**
 * ingest(order) -> { ok, steps[] }
 * order: { platform, orderId, buyerName, buyerPhone, total, currency,
 *          paymentMethod|cod, itemsText, buyerOrders, referralCode, createdAt }
 */
async function ingest(order) {
  const o = order || {};
  const steps = [];
  if (!o.platform || !o.orderId) return { ok: false, error: 'platform_and_orderId_required' };

  // 1) admin notify + (built-in) COD confirm prompt via orderNotify.processOrder
  if (notify && notify.processOrder) steps.push(await safe('notify', function () { return notify.processOrder(o); }));

  // 2) RTO risk score (for admin triage / decide OTP)
  let band = 'low';
  if (risk && risk.score) {
    const r = risk.score({ cod: isCod(o), total: o.total, paymentMethod: o.paymentMethod, buyerOrders: o.buyerOrders, confirmed: false });
    band = r.band;
    steps.push({ step: 'risk', ok: true, result: r });
  }

  // 3) high-risk COD -> stronger OTP verification
  if (isCod(o) && band === 'high' && codOtp && codOtp.issue && o.buyerPhone) {
    steps.push(await safe('codOtp', function () { return codOtp.issue({ buyerPhone: o.buyerPhone, orderId: o.orderId }); }));
  }

  // 4) loyalty points for the spend
  if (loyalty && loyalty.award && o.buyerPhone) steps.push(await safe('loyalty', function () { return loyalty.award(o.buyerPhone, o.total || 0, { reason: 'order', orderId: o.orderId }); }));

  // 5) timeline log
  if (timeline && timeline.record) steps.push(await safe('timeline', function () { return timeline.record(o.platform, o.orderId, 'order_created', { total: o.total }); }));

  // 6) keep contact for marketing/reorder (opt-out aware downstream)
  if (contacts && contacts.upsertContact && o.buyerPhone) steps.push(await safe('contact', function () { return contacts.upsertContact(o.buyerPhone, { name: o.buyerName || null, platform: o.platform, lastOrderAt: o.createdAt || new Date().toISOString() }); }));

  // 7) referral reward if this order cited a code
  if (o.referralCode && referral && referral.apply && o.buyerPhone) steps.push(await safe('referral', function () { return referral.apply(o.buyerPhone, o.referralCode, o.total || 0); }));

  return { ok: true, orderId: o.orderId, platform: o.platform, riskBand: band, steps: steps };
}

/**
 * ship(rec) -> tracking + status + timeline
 * rec: { platform, orderId, buyerPhone, courier, trackingId }
 */
async function ship(rec) {
  const r = rec || {}; const steps = [];
  if (!r.platform || !r.orderId) return { ok: false, error: 'platform_and_orderId_required' };
  if (tracking && tracking.setTracking && r.trackingId) steps.push(await safe('tracking', function () { return tracking.setTracking(r); }));
  if (notify && notify.send && r.buyerPhone && tracking && tracking.buyerMsg) steps.push(await safe('notifyBuyer', function () { return notify.send(r.buyerPhone, tracking.buyerMsg(r)); }));
  if (orderStatus && orderStatus.update) steps.push(await safe('status', function () { return orderStatus.update({ platform: r.platform, orderId: r.orderId, buyerPhone: r.buyerPhone, status: 'shipped' }); }));
  if (timeline && timeline.record) steps.push(await safe('timeline', function () { return timeline.record(r.platform, r.orderId, 'shipped', { courier: r.courier, trackingId: r.trackingId }); }));
  return { ok: true, orderId: r.orderId, steps: steps };
}

/**
 * deliver(rec) -> status delivered + POD + review + NPS + reorder enroll + timeline
 * rec: { platform, orderId, buyerPhone, productId?, pod?, everyDays? }
 */
async function deliver(rec) {
  const r = rec || {}; const steps = [];
  if (!r.platform || !r.orderId) return { ok: false, error: 'platform_and_orderId_required' };
  if (orderStatus && orderStatus.update) steps.push(await safe('status', function () { return orderStatus.update({ platform: r.platform, orderId: r.orderId, buyerPhone: r.buyerPhone, status: 'delivered' }); }));
  if (r.pod && deliveryProof && deliveryProof.record) steps.push(await safe('pod', function () { return deliveryProof.record(r.orderId, r.pod); }));
  if (reviews && reviews.requestReview && r.buyerPhone) steps.push(await safe('review', function () { return reviews.requestReview({ platform: r.platform, orderId: r.orderId, buyerPhone: r.buyerPhone }); }));
  if (nps && nps.ask && r.buyerPhone) steps.push(await safe('nps', function () { return nps.ask({ buyerPhone: r.buyerPhone, orderId: r.orderId }); }));
  if (r.productId && subscriptions && subscriptions.create && r.everyDays && r.buyerPhone) steps.push(await safe('subscription', function () { return subscriptions.create({ phone: r.buyerPhone, productId: r.productId, everyDays: r.everyDays }); }));
  if (timeline && timeline.record) steps.push(await safe('timeline', function () { return timeline.record(r.platform, r.orderId, 'delivered', null); }));
  return { ok: true, orderId: r.orderId, steps: steps };
}

module.exports = { ingest, ship, deliver };
