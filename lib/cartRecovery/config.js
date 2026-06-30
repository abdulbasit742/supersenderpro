'use strict';
// #80 Abandoned Cart Recovery — config. Advisory/draft-safe by default.
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function bool(v, d) { if (v === undefined || v === null || v === '') return d; return String(v).toLowerCase() === 'true' || v === '1'; }

module.exports = {
  enabled: bool(process.env.CART_RECOVERY_ENABLED, true),
  // Minutes of inactivity before an open cart is considered abandoned.
  abandonAfterMinutes: num(process.env.CART_ABANDON_AFTER_MIN, 60),
  // Recovery nudge schedule, in hours after abandonment.
  nudgeOffsetsHours: (process.env.CART_NUDGE_OFFSETS_HOURS || '1,24,72')
    .split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n >= 0),
  // Minimum cart value to bother recovering.
  minCartValue: num(process.env.CART_MIN_VALUE, 0),
  // Offer a win-back coupon on the final nudge.
  finalNudgeCoupon: bool(process.env.CART_FINAL_COUPON, true),
  // Win-back coupon: percent off.
  couponPercent: num(process.env.CART_COUPON_PERCENT, 10),
  // Stop nudging after this many attempts (also bounded by schedule length).
  maxNudges: num(process.env.CART_MAX_NUDGES, 3)
};
