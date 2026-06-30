'use strict';

/**
 * Ecommerce Hub — order fulfillment priority queue.
 * Scores orders for dispatch priority (prepaid > COD, high value, VIP buyer,
 * older first) so staff pack the right ones first. Pure ranking over inputs.
 */

function score(o) {
  o = o || {};
  let s = 0;
  const isCod = o.cod === true || /cod|cash/i.test(String(o.paymentMethod || ''));
  if (!isCod) s += 30;                       // prepaid first (money in hand)
  if (o.vip) s += 20;
  if (Number(o.total || 0) >= Number(process.env.PRIORITY_HIGH_VALUE || 5000)) s += 15;
  if (o.confirmed) s += 10;
  const ageH = o.createdAt ? Math.max(0, (Date.now() - new Date(o.createdAt).getTime()) / 3600000) : 0;
  s += Math.min(25, ageH); // older waits less
  return Math.round(s);
}
function rank(orders) {
  return (orders || []).map(function (o) { return Object.assign({ priority: score(o) }, o); })
    .sort(function (a, b) { return b.priority - a.priority; });
}
module.exports = { score, rank };
