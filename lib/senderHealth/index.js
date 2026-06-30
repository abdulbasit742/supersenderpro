// lib/senderHealth/index.js — Sender Health & Anti-Ban governor (barrel export).
//
// A central send-rate governor for WhatsApp numbers to reduce bans. Per-number warmup ramp
// (new numbers start low and grow daily), daily + hourly caps, randomized human-like inter-send
// jitter, spintax message variation, and block/complaint tracking feeding a 0-100 health score.
// Every outbound send should pass through gate(number) first.
//
// SAFETY: ADVISORY only — this module NEVER sends. gate() returns allow/hold/deny + a recommended
// delay; the real sender obeys it and calls recordSend()/recordBlock()/recordComplaint() to keep
// state accurate. JSON-backed; numbers masked in views; no message bodies stored.

const { config } = require('./config');

module.exports = {
 config,
 store: require('./store'),
 numberRegistry: require('./numberRegistry'),
 healthScore: require('./healthScore'),
 spintax: require('./spintax'),
 governor: require('./governor'),
 doctor: require('./doctor'),
 // convenience top-level helpers
 gate: require('./governor').gate,
 gateAndRecord: require('./governor').gateAndRecord,
 spin: require('./spintax').spin,
};
