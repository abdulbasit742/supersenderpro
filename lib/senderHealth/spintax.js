// lib/senderHealth/spintax.js — Spintax message variation to reduce identical-message footprints.
// Syntax: {option a|option b|option c}. Nested spintax supported. Deterministic when a seed is
// provided (useful for tests); random otherwise. Also exposes count() for total variations.

function _rand(seed) {
 if (seed === undefined) return Math.random();
 // simple deterministic PRNG (mulberry32) for reproducible tests
 let t = (seed += 0x6D2B79F5);
 t = Math.imul(t ^ (t >>> 15), t | 1);
 t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
 return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function spin(text, seed) {
 let s = String(text == null ? '' : text);
 let guard = 0;
 const re = /\{([^{}]*)\}/; // innermost group with no nested braces
 while (re.test(s) && guard < 1000) {
 s = s.replace(re, (_m, body) => {
 const opts = body.split('|');
 const idx = Math.floor(_rand(seed === undefined ? undefined : seed + guard) * opts.length);
 return opts[Math.min(idx, opts.length - 1)];
 });
 guard += 1;
 }
 return s;
}

// Count total distinct variations (product of option counts across all groups, ignoring nesting overlap).
function count(text) {
 let total = 1;
 const re = /\{([^{}]*)\}/g;
 let s = String(text == null ? '' : text);
 let guard = 0;
 while (guard < 1000) {
 const groups = s.match(/\{([^{}]*)\}/g);
 if (!groups) break;
 for (const g of groups) { const body = g.slice(1, -1); total *= Math.max(1, body.split('|').length); }
 s = s.replace(/\{([^{}]*)\}/g, (_m, body) => body.split('|')[0]);
 guard += 1;
 }
 return total;
}

module.exports = { spin, count };
