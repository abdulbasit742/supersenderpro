'use strict';
// Cart & Abandoned-Cart Recovery — config
// All knobs env-overridable. Safe defaults: DRY-RUN, nothing auto-sends.

function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function bool(v, d) { if (v === undefined || v === null || v === '') return d; return String(v).toLowerCase() === 'true' || v === '1'; }

const config = {
  // Master safety switch. When false (default) recovery messages are DRAFTED only, never sent.
  liveSend: bool(process.env.CART_RECOVERY_LIVE, false),

  // A cart is considered "abandoned" after this many minutes of inactivity.
  abandonAfterMinutes: num(process.env.CART_ABANDON_MINUTES, 60),

  // Recovery nudge ladder (minutes after abandonment). Each step drafts one message.
  // Defaults: 1h, 24h, 72h after abandonment.
  nudgeStepsMinutes: (process.env.CART_NUDGE_STEPS || '60,1440,4320')
    .split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n >= 0),

  // Max nudges per cart, hard cap regardless of ladder length.
  maxNudges: num(process.env.CART_MAX_NUDGES, 3),

  // Quiet hours (local 24h clock). No nudge drafted to "due" inside this window; it waits.
  quietStartHour: num(process.env.CART_QUIET_START, 22),
  quietEndHour: num(process.env.CART_QUIET_END, 8),

  // Optional incentive: attach a coupon code on the final nudge (uses coupons dept if present).
  incentiveOnFinalNudge: bool(process.env.CART_INCENTIVE_FINAL, true),
  incentiveCouponHint: process.env.CART_INCENTIVE_COUPON || '', // explicit code; else asks coupons dept

  // Carts past this age (minutes) with no conversion are marked lost and stop nudging.
  expireAfterMinutes: num(process.env.CART_EXPIRE_MINUTES, 10080), // 7 days

  currency: process.env.CART_CURRENCY || 'PKR',
};

module.exports = { config };
