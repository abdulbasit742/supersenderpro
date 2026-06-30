// lib/audienceSegments/index.js — Audience Segments: dynamic contact segmentation (barrel).
//
// Define dynamic segments with AND/OR rule groups over contact attributes / tags / activity /
// spend, evaluate them live against a pluggable READ-ONLY contact source (auto-detects
// lib/storeCRM), preview match counts (PII masked), and resolve a segment to a recipient list
// for broadcasts + drip enrollment.
//
// SAFETY: read-only over contacts (never copies/mutates them). Only segment DEFINITIONS are
// JSON-backed. Previews mask PII. Inject a custom contact source via
// require('./lib/audienceSegments').contactSource.setSource(fn).

const { config } = require('./config');
const contactSource = require('./contactSource');

module.exports = {
 config,
 store: require('./store'),
 privacy: require('./privacy'),
 contactSource,
 ruleEngine: require('./ruleEngine'),
 segmentStore: require('./segmentStore'),
 evaluator: require('./evaluator'),
 doctor: require('./doctor'),
 setSource: contactSource.setSource,
};
