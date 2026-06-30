// lib/contacts/index.js — Contacts & Segmentation (barrel export).
//
// A unified, deduped contact book (phone/email normalized, Pakistan 03xx -> +923xx), with tags,
// custom fields, and consent/opt-out tracking, plus a SAFE rule-based dynamic segment engine
// (AND/OR over tags / fields / activity) that evaluates membership live.
//
// SAFETY: JSON-backed; PII masked in views. Segments use a JSON rule tree — NO eval, no code
// execution. Consent-aware: opted-out contacts are excluded from segment results + recipient
// resolution by default, so downstream sends can't reach them.

const { config } = require('./config');

module.exports = {
 config,
 store: require('./store'),
 normalize: require('./normalize'),
 privacy: require('./privacy'),
 contactStore: require('./contactStore'),
 segmentEngine: require('./segmentEngine'),
 doctor: require('./doctor'),
};
