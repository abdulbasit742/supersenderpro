'use strict';
// #74 Referral Program — config (env-driven, safe defaults). Advisory by default.
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function bool(v, d) { if (v === undefined || v === null || v === '') return d; return String(v).toLowerCase() === 'true' || v === '1'; }

module.exports = {
  enabled: bool(process.env.REFERRAL_ENABLED, true),
  // Reward type for the qualifying event: 'points' (loyalty #71) or 'coupon' (#59) or 'advisory'.
  rewardType: (process.env.REFERRAL_REWARD_TYPE || 'points').toLowerCase(),
  // Reward the referrer earns when a referee qualifies.
  referrerReward: num(process.env.REFERRAL_REFERRER_REWARD, 500),
  // Reward the new referee earns on signup/first qualifying order.
  refereeReward: num(process.env.REFERRAL_REFEREE_REWARD, 250),
  // What counts as 'qualified': 'signup' or 'first_order'.
  qualifyOn: (process.env.REFERRAL_QUALIFY_ON || 'first_order').toLowerCase(),
  // Min order value for first_order qualification.
  minOrderToQualify: num(process.env.REFERRAL_MIN_ORDER, 0),
  // Max successful referrals rewarded per referrer (0 = unlimited).
  maxPerReferrer: num(process.env.REFERRAL_MAX_PER_REFERRER, 0),
  // Code length for generated referral codes.
  codeLength: num(process.env.REFERRAL_CODE_LENGTH, 8)
};
