'use strict';
// #80 Abandoned Cart Recovery — self-diagnostic.
const config = require('./config');
const store = require('./store');

function check() {
  const ok = [], issues = [];
  if (config.abandonAfterMinutes <= 0) issues.push('CART_ABANDON_AFTER_MIN <= 0');
  else ok.push(`abandon after ${config.abandonAfterMinutes}m`);
  if (!config.nudgeOffsetsHours.length) issues.push('no nudge offsets configured');
  else ok.push(`nudges at ${config.nudgeOffsetsHours.join('/')}h`);
  ok.push(config.finalNudgeCoupon ? `final coupon ${config.couponPercent}%` : 'no final coupon');
  try { require('../coupons'); ok.push('coupons bridge available'); } catch (_) { ok.push('coupons bridge absent (advisory)'); }
  let db; try { db = store.load(); ok.push('store readable'); } catch (e) { issues.push('store unreadable: ' + e.message); }
  const carts = db ? Object.values(db.carts) : [];
  const stats = { open: 0, abandoned: 0, recovered: 0, paid: 0 };
  carts.forEach(c => { if (stats[c.status] !== undefined) stats[c.status]++; });
  return { dept: 'cartRecovery', enabled: config.enabled, ok, issues, stats, healthy: issues.length === 0 };
}
module.exports = { check };
