'use strict';
// #74 Referral Program — self-diagnostic.
const config = require('./config');
const store = require('./store');

function check() {
  const ok = [], issues = [];
  if (!['points', 'coupon', 'advisory'].includes(config.rewardType)) issues.push('REFERRAL_REWARD_TYPE invalid');
  else ok.push('rewardType=' + config.rewardType);
  if (config.referrerReward < 0 || config.refereeReward < 0) issues.push('negative reward configured');
  else ok.push('rewards non-negative');
  if (!['signup', 'first_order'].includes(config.qualifyOn)) issues.push('REFERRAL_QUALIFY_ON invalid');
  else ok.push('qualifyOn=' + config.qualifyOn);
  // Bridge availability (informational, not failures).
  try { require('../loyalty'); ok.push('loyalty bridge available'); } catch (_) { ok.push('loyalty bridge absent (advisory)'); }
  try { require('../coupons'); ok.push('coupons bridge available'); } catch (_) { ok.push('coupons bridge absent (advisory)'); }
  let db; try { db = store.load(); ok.push('store readable'); } catch (e) { issues.push('store unreadable: ' + e.message); }
  const codes = db ? Object.keys(db.codes || {}).length : 0;
  const refs = db ? (db.referrals || []).length : 0;
  return { dept: 'referral', enabled: config.enabled, ok, issues, stats: { codes, referrals: refs }, healthy: issues.length === 0 };
}
module.exports = { check };
