// lib/consentCenter/keywords.js — Classify an inbound message as opt-out / opt-in / none.
// Normalizes the text (lowercase, trim, strip punctuation/emoji-ish) then matches against the
// configured keyword sets. A message counts as a command if it IS (or starts with) a keyword,
// so 'STOP', 'stop.', 'STOP please' all opt out, but 'non-stop service' does not.

const { config } = require('./config');

function _normalize(text) {
 return String(text == null ? '' : text).toLowerCase().trim().replace(/[!.?,;:]+$/g, '').replace(/\s+/g, ' ');
}

function _matches(norm, keywords) {
 for (const k of keywords) {
 if (norm === k) return true;
 if (norm.startsWith(k + ' ')) return true; // 'stop please'
 }
 return false;
}

// Returns 'opt_out' | 'opt_in' | null.
function classify(text) {
 const norm = _normalize(text);
 if (!norm) return null;
 if (_matches(norm, config.stopKeywords)) return 'opt_out';
 if (_matches(norm, config.startKeywords)) return 'opt_in';
 return null;
}

module.exports = { classify, _normalize };
