// lib/abTesting/stats.js — Per-variant conversion rates + a simple winner heuristic. Deliberately
// lightweight (no external stats lib): rate = conversions/assigned; a winner needs (a) enough
// sample per variant and (b) a lead over the runner-up of at least minRateGapPct points.

const { config } = require('./config');

function summarize(experiment) {
 const variants = (experiment.variants || []).map((v) => {
 const assigned = v.assigned || 0;
 const conversions = v.conversions || 0;
 const rate = assigned ? conversions / assigned : 0;
 return { id: v.id, label: v.label || v.id, weight: v.weight || 1, assigned, conversions, ratePct: Math.round(rate * 1000) / 10 };
 });
 const ranked = variants.slice().sort((a, b) => b.ratePct - a.ratePct);
 const leader = ranked[0];
 const runnerUp = ranked[1];
 const enoughSample = variants.length > 0 && variants.every((v) => v.assigned >= config.minSamplePerVariant);
 let winner = null;
 if (enoughSample && leader && runnerUp && (leader.ratePct - runnerUp.ratePct) >= config.minRateGapPct) winner = leader.id;
 else if (enoughSample && leader && variants.length === 1) winner = leader.id;
 return {
 variants: ranked,
 totals: { assigned: variants.reduce((s, v) => s + v.assigned, 0), conversions: variants.reduce((s, v) => s + v.conversions, 0) },
 enoughSample, winner,
 confidence: winner ? 'heuristic: sample + rate-gap met' : (enoughSample ? 'inconclusive: rate gap too small' : 'insufficient sample'),
 };
}

module.exports = { summarize };
