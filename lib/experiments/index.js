// lib/experiments/index.js — A/B Testing (experiments) (barrel export).
//
// Define message A/B/n tests with weighted variants, deterministically + stickily assign each
// contact to a variant (same contact always gets the same one), record sends + conversions per
// variant, and compute results: conversion rate, lift vs control, a two-proportion z-test for
// significance, and an advisory recommended winner. Pairs with broadcast/drip (assign + send the
// variant message) and short-links #32 (a click = a conversion).
//
// SAFETY: JSON-backed. This module never sends; it assigns + scores. Winner declaration is
// explicit/advisory (never auto-acts). Contacts are used only as opaque assignment tokens.

const { config } = require('./config');

module.exports = {
 config,
 store: require('./store'),
 assignment: require('./assignment'),
 stats: require('./stats'),
 experimentEngine: require('./experimentEngine'),
 doctor: require('./doctor'),
 // convenience
 assignFor: require('./experimentEngine').assignFor,
 recordConversion: require('./experimentEngine').recordConversion,
};
