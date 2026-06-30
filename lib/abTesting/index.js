// lib/abTesting/index.js — A/B Testing: multi-variant message experiments (barrel export).
//
// Define experiments with weighted variants (each carries a message body), deterministically
// assign each contact to a variant (stable hash — no flip-flop, no per-contact storage needed for
// the decision), pick the variant body at send time, record conversions, and compute per-variant
// rates with a simple sample+rate-gap winner heuristic.
//
// SAFETY: JSON-backed; decides + measures only, never sends. Contacts are used only as a hash
// input and as assignment keys; views expose counts, not raw contacts. Experiments are archived,
// never hard-deleted. Pairs with drip #6 / scheduler #17 / broadcast (variantFor pre-send) and
// analytics #9 / short links #32 (recordConversion on reply/click/purchase).

const { config } = require('./config');

module.exports = {
 config,
 store: require('./store'),
 assign: require('./assign'),
 stats: require('./stats'),
 experimentEngine: require('./experimentEngine'),
 doctor: require('./doctor'),
 // convenience
 variantFor: require('./experimentEngine').variantFor,
 recordConversion: require('./experimentEngine').recordConversion,
};
