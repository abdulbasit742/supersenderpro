// lib/coupons/index.js — Coupons & Discount Codes (barrel export).
//
// Create percentage / fixed-amount / free-shipping discount codes with min-spend, global +
// per-contact usage caps, and a validity window; VALIDATE a code against an order total (returns
// the discount + final amount) without redeeming; REDEEM atomically (idempotent per code+orderId)
// with an auditable ledger; and bulk-generate unique single-use codes. Pairs with payments #1
// (apply at checkout), customer 360 #46 + analytics #9 (redemption events).
//
// SAFETY: JSON-backed; validates + records redemptions only — never charges or sends. Codes are
// case-insensitive + unique; coupons deactivated, never hard-deleted. Contacts masked in views.

const { config, TYPES } = require('./config');

module.exports = {
 config, TYPES,
 store: require('./store'),
 privacy: require('./privacy'),
 codeGen: require('./codeGen'),
 couponStore: require('./couponStore'),
 validator: require('./validator'),
 redemption: require('./redemption'),
 doctor: require('./doctor'),
 // convenience
 validate: require('./validator').validate,
 redeem: require('./redemption').redeem,
};
