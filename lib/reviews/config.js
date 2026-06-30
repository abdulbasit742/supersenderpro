'use strict';
// #77 Reviews & Ratings — config (env-driven). Advisory-safe by default.
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function bool(v, d) { if (v === undefined || v === null || v === '') return d; return String(v).toLowerCase() === 'true' || v === '1'; }

module.exports = {
  enabled: bool(process.env.REVIEWS_ENABLED, true),
  minRating: num(process.env.REVIEWS_MIN_RATING, 1),
  maxRating: num(process.env.REVIEWS_MAX_RATING, 5),
  // New reviews start 'pending' and need approval before counting in aggregates.
  autoApprove: bool(process.env.REVIEWS_AUTO_APPROVE, false),
  // Auto-flag reviews containing these comma-separated words (simple profanity/spam guard).
  flagWords: (process.env.REVIEWS_FLAG_WORDS || 'scam,spam,fake,fraud').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  // Only allow one review per (contact, product).
  oneePerProduct: bool(process.env.REVIEWS_ONE_PER_PRODUCT, true),
  // Negative reviews at/below this rating raise an alert (#28) if wired.
  alertAtOrBelow: num(process.env.REVIEWS_ALERT_AT_OR_BELOW, 2)
};
