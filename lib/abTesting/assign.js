// lib/abTesting/assign.js — Deterministic, weighted variant assignment. The same (experiment,
// contact) pair ALWAYS maps to the same variant (stable SHA-256 hash -> [0,1) -> weighted bucket),
// so a contact never flip-flops between variants across sends, with no per-contact storage needed.

const crypto = require('crypto');

// Map a string to a uniform float in [0,1) via the first 8 hex of a SHA-256 digest.
function _unit(str) {
 const hex = crypto.createHash('sha256').update(String(str)).digest('hex').slice(0, 8);
 return parseInt(hex, 16) / 0xffffffff;
}

// variants: [{ id, weight }]. Returns the chosen variant id for this contact.
function pickVariant(experimentId, contact, variants) {
 if (!Array.isArray(variants) || !variants.length) return null;
 const weights = variants.map((v) => (Number(v.weight) > 0 ? Number(v.weight) : 0));
 const total = weights.reduce((a, b) => a + b, 0) || variants.length;
 const norm = weights.map((w) => (total ? (w || (total / variants.length)) / total : 1 / variants.length));
 const u = _unit(`${experimentId}:${contact}`);
 let acc = 0;
 for (let i = 0; i < variants.length; i++) { acc += norm[i]; if (u < acc) return variants[i].id; }
 return variants[variants.length - 1].id;
}

module.exports = { pickVariant, _unit };
