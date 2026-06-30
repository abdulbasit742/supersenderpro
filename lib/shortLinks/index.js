// lib/shortLinks/index.js — Short Links & Click Tracking (barrel export).
//
// Create branded short URLs for any (validated) destination, expand {{link:...}} merge tags into
// per-contact tracked URLs right before a send, record PII-safe clicks, and roll them up into
// click analytics (totals, unique contacts, by-campaign, time series). Pairs with drip #6 /
// scheduler #17 (expand links pre-send), analytics #9 (feed click events), alerts #28.
//
// SAFETY: JSON-backed. Destinations are validated (http/https only, internal hosts blocked,
// optional allowlist) to prevent open-redirect abuse. Click records store a MASKED contact and
// only a coarse UA family (no fingerprinting). Links are deactivated, never hard-deleted.

const { config } = require('./config');

module.exports = {
 config,
 store: require('./store'),
 privacy: require('./privacy'),
 urlGuard: require('./urlGuard'),
 codeGen: require('./codeGen'),
 linkStore: require('./linkStore'),
 clickTracker: require('./clickTracker'),
 mergeLinks: require('./mergeLinks'),
 analytics: require('./analytics'),
 doctor: require('./doctor'),
};
