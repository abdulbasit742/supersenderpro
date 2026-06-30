// lib/experiments/stats.js — Conversion-rate comparison stats. Two-proportion z-test between a
// variant and the control, plus lift. Dependency-free. Returns null significance when samples are
// too small for a meaningful test.

function rate(conversions, sends) { return sends > 0 ? conversions / sends : 0; }

// Two-proportion z-test. Returns { z, significant } or { z:null } if not computable.
function zTest(aConv, aN, bConv, bN, zThreshold = 1.96) {
 if (aN <= 0 || bN <= 0) return { z: null, significant: false };
 const p1 = aConv / aN, p2 = bConv / bN;
 const pPool = (aConv + bConv) / (aN + bN);
 const se = Math.sqrt(pPool * (1 - pPool) * (1 / aN + 1 / bN));
 if (se === 0) return { z: 0, significant: false };
 const z = (p1 - p2) / se;
 return { z: Math.round(z * 1000) / 1000, significant: Math.abs(z) >= zThreshold };
}

function lift(variantRate, controlRate) {
 if (controlRate === 0) return variantRate > 0 ? Infinity : 0;
 return Math.round(((variantRate - controlRate) / controlRate) * 1000) / 10; // percent, 1dp
}

module.exports = { rate, zTest, lift };
