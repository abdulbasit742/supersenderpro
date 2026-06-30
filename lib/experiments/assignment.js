// lib/experiments/assignment.js — Deterministic, sticky, weighted variant assignment. A contact's
// variant is derived from a stable hash of (experimentId + contact), mapped onto the cumulative
// weight distribution. Same contact always lands in the same variant (sticky) without storing
// anything, but we ALSO persist the assignment so analytics can report unique exposure cleanly.

const crypto = require('crypto');

// Hash -> float in [0,1).
function _unit(experimentId, contact) {
 const h = crypto.createHash('sha256').update(`${experimentId}:${contact}`).digest();
 // take first 6 bytes as an integer for plenty of resolution
 const n = h.readUIntBE(0, 6);
 return n / 0x1000000000000; // 2^48
}

// variants: [{ id, weight }]. Returns the chosen variant id for this contact.
function pick(experimentId, contact, variants) {
 const total = variants.reduce((s, v) => s + (Number(v.weight) > 0 ? Number(v.weight) : 0), 0) || variants.length;
 const u = _unit(experimentId, contact) * total;
 let acc = 0;
 for (const v of variants) {
 acc += (Number(v.weight) > 0 ? Number(v.weight) : (total / variants.length));
 if (u < acc) return v.id;
 }
 return variants[variants.length - 1].id;
}

module.exports = { pick, _unit };
