// lib/experiments/statistics.js
// Small, dependency-free statistics for A/B tests. No SciPy, no npm dep — just
// the math we need to know whether one message variant really beats another or
// whether the difference is noise. Runs anywhere (incl. the PC #2 batch box).

// Standard normal CDF via the Abramowitz & Stegun erf approximation.
function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

function round(n, dp = 4) {
  const f = Math.pow(10, dp);
  return Math.round((Number(n) || 0) * f) / f;
}

// Two-proportion z-test. Returns the conversion rates, absolute + relative lift,
// z-score, two-sided p-value, and whether it clears the given confidence level.
function twoProportionTest(aConv, aN, bConv, bN, confidence = 0.95) {
  if (aN <= 0 || bN <= 0) {
    return { ok: false, reason: 'insufficient sample', pA: 0, pB: 0 };
  }
  const pA = aConv / aN;
  const pB = bConv / bN;
  const pPool = (aConv + bConv) / (aN + bN);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / aN + 1 / bN));
  if (se === 0) {
    return { ok: true, pA: round(pA), pB: round(pB), z: 0, pValue: 1, significant: false, absLift: 0, relLiftPct: 0 };
  }
  const z = (pB - pA) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const alpha = 1 - confidence;
  return {
    ok: true,
    pA: round(pA),
    pB: round(pB),
    z: round(z, 3),
    pValue: round(pValue),
    significant: pValue < alpha,
    confidence,
    absLift: round(pB - pA),
    relLiftPct: pA > 0 ? round(((pB - pA) / pA) * 100, 2) : null,
  };
}

// Rough "are we there yet" sample-size hint for a target minimum detectable
// effect (absolute), at 95% confidence / 80% power. Helps the dashboard say
// "need ~N more per variant" instead of declaring a winner too early.
function sampleSizePerVariant(baselineRate, mde) {
  const p = Math.min(0.99, Math.max(0.01, baselineRate || 0.1));
  const delta = Math.max(0.005, mde || 0.05);
  const zA = 1.96; // 95%
  const zB = 0.84; // 80% power
  const n = Math.pow(zA + zB, 2) * 2 * p * (1 - p) / (delta * delta);
  return Math.ceil(n);
}

module.exports = { twoProportionTest, sampleSizePerVariant, normalCdf, round };
