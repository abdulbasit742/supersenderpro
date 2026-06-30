'use strict';
// #74 Referral Program — attribution + reward issuance. Advisory-safe.
const crypto = require('crypto');
const config = require('./config');
const store = require('./store');

function id() { return 'ref_' + crypto.randomBytes(8).toString('hex'); }

// Record that a referee used a code. Status starts 'pending' until qualified.
function attribute(db, { tenantId, code, refereeId }) {
  if (!code || !refereeId) throw new Error('code and refereeId required');
  const entry = store.findCode(db, code);
  if (!entry) return { ok: false, error: 'invalid_code' };
  if (entry.ownerId === refereeId) return { ok: false, error: 'self_referral' };
  // Prevent double-attribution of the same referee.
  const dup = db.referrals.find(r => r.tenantId === (tenantId || 'default') && r.refereeId === refereeId);
  if (dup) return { ok: false, error: 'already_referred', referral: dup };
  const rec = { id: id(), tenantId: tenantId || 'default', code: entry.code, referrerId: entry.ownerId, refereeId, status: 'pending', createdAt: new Date().toISOString(), qualifiedAt: null, rewards: null };
  db.referrals.push(rec);
  entry.uses = (entry.uses || 0) + 1;
  return { ok: true, referral: rec };
}

// Mark a referee as qualified (signup or first_order) and compute rewards.
function qualify(db, { tenantId, refereeId, orderTotal }) {
  const rec = db.referrals.find(r => r.tenantId === (tenantId || 'default') && r.refereeId === refereeId && r.status === 'pending');
  if (!rec) return { ok: false, error: 'no_pending_referral' };
  if (config.qualifyOn === 'first_order' && (Number(orderTotal) || 0) < config.minOrderToQualify) {
    return { ok: false, error: 'below_min_order' };
  }
  // Enforce per-referrer cap.
  if (config.maxPerReferrer > 0) {
    const rewarded = db.referrals.filter(r => r.referrerId === rec.referrerId && r.status === 'qualified').length;
    if (rewarded >= config.maxPerReferrer) {
      rec.status = 'capped';
      rec.qualifiedAt = new Date().toISOString();
      return { ok: true, capped: true, referral: rec };
    }
  }
  rec.status = 'qualified';
  rec.qualifiedAt = new Date().toISOString();
  rec.rewards = issueRewards(rec);
  return { ok: true, referral: rec };
}

// Issue two-sided rewards via loyalty (#71) or coupons (#59); degrade to advisory.
function issueRewards(rec) {
  const out = { referrer: null, referee: null, mode: config.rewardType };
  if (config.rewardType === 'points') {
    try {
      const loyalty = require('../loyalty');
      if (loyalty && typeof loyalty.adjust === 'function') {
        loyalty.adjust({ tenantId: rec.tenantId, contactId: rec.referrerId, points: config.referrerReward, reason: 'referral:referrer' });
        loyalty.adjust({ tenantId: rec.tenantId, contactId: rec.refereeId, points: config.refereeReward, reason: 'referral:referee' });
        out.referrer = { points: config.referrerReward };
        out.referee = { points: config.refereeReward };
        return out;
      }
    } catch (_) { /* loyalty absent */ }
  }
  if (config.rewardType === 'coupon') {
    try {
      const coupons = require('../coupons');
      if (coupons && typeof coupons.createCoupon === 'function') {
        out.referrer = coupons.createCoupon({ tenantId: rec.tenantId, type: 'fixed', amount: config.referrerReward, note: `referral:referrer:${rec.referrerId}`, singleUse: true });
        out.referee = coupons.createCoupon({ tenantId: rec.tenantId, type: 'fixed', amount: config.refereeReward, note: `referral:referee:${rec.refereeId}`, singleUse: true });
        return out;
      }
    } catch (_) { /* coupons absent */ }
  }
  // Advisory fallback: record intended rewards, issue nothing.
  out.mode = 'advisory';
  out.referrer = { advisory: config.referrerReward };
  out.referee = { advisory: config.refereeReward };
  return out;
}

module.exports = { attribute, qualify, issueRewards };
