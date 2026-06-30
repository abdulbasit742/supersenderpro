'use strict';

/**
 * Ecommerce Hub — COD RTO (return-to-origin) risk score.
 * Heuristic 0-100 risk for a COD order so admins can triage which orders to
 * call before dispatch. Higher = riskier. No ML, just transparent rules:
 *   + new/unknown buyer, + high value, + no confirm yet, + repeated cancels,
 *   - repeat buyer, - already confirmed. Pure logic.
 */

const cod = require('./codStore');

function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function score(order) {
  const o = order || {};
  let risk = 30; // base
  const orders = Number(o.buyerOrders || 0);
  const total = Number(o.total || 0);
  const highValue = Number(process.env.RTO_HIGH_VALUE || 5000);

  if (orders <= 0) risk += 25;            // brand-new buyer
  else if (orders >= 5) risk -= 20;       // loyal
  else if (orders >= 2) risk -= 10;

  if (total >= highValue) risk += 20;     // expensive COD = more RTO pain
  if (total >= highValue * 2) risk += 10;

  const isCod = o.cod === true || /cod|cash/i.test(String(o.paymentMethod || ''));
  if (!isCod) risk -= 25;                  // prepaid = low RTO risk

  if (o.confirmed === true) risk -= 25;    // already double-confirmed
  if (o.priorCancels && o.priorCancels > 0) risk += Math.min(20, o.priorCancels * 10);

  risk = Math.max(0, Math.min(100, Math.round(risk)));
  const band = risk >= 70 ? 'high' : (risk >= 40 ? 'medium' : 'low');
  return { ok: true, risk: risk, band: band, recommend: band === 'high' ? 'Call to confirm before dispatch' : (band === 'medium' ? 'Send WhatsApp confirm' : 'Dispatch normally') };
}

function reply(order) {
  const r = score(order);
  return '\u2696\ufe0f *RTO risk: ' + r.risk + '/100 (' + r.band + ')*\n' + r.recommend;
}

module.exports = { score, reply };
