'use strict';
/**
 * leadScoringEngine.js — CRM Feature #2: explainable lead/customer scoring.
 *
 * Turns a Customer 360 profile (#1) into a 0–100 score and a band (hot/warm/cold), so sales and
 * automation know who to chase first. The old `lib/leadScoring.js` was a stub; this is a real,
 * configurable, EXPLAINABLE scorer — it returns not just a number but WHY (per-rule contribution),
 * which matters because a black-box score nobody trusts gets ignored.
 *
 * Rules are weighted and configurable. Each rule reads fields off the 360 profile and returns 0..1
 * (how strongly it fires); the weighted sum is scaled to 0..100.
 *
 * Storage-free: you pass in a profile (from customer360.getProfile). Pure function = easy to test.
 */

// Default rule set. Each: { key, weight, score(profile)->0..1, why(profile)->string }
let RULES = [
  {
    key: 'recent_purchase', weight: 25,
    score: p => p.lastOrderDaysAgo == null ? 0 : (p.lastOrderDaysAgo <= 30 ? 1 : p.lastOrderDaysAgo <= 90 ? 0.5 : 0.1),
    why: p => p.lastOrderDaysAgo == null ? 'never ordered' : `last order ${p.lastOrderDaysAgo}d ago`
  },
  {
    key: 'spend', weight: 25,
    score: p => { const s = Number(p.totalSpent || 0); return s >= 10000 ? 1 : s >= 3000 ? 0.6 : s > 0 ? 0.3 : 0; },
    why: p => `total spent ${p.totalSpent || 0}`
  },
  {
    key: 'order_frequency', weight: 15,
    score: p => { const n = Number(p.orderCount || 0); return n >= 5 ? 1 : n >= 2 ? 0.6 : n === 1 ? 0.3 : 0; },
    why: p => `${p.orderCount || 0} orders`
  },
  {
    key: 'engagement', weight: 15,
    score: p => p.lastInboundDaysAgo == null ? 0 : (p.lastInboundDaysAgo <= 7 ? 1 : p.lastInboundDaysAgo <= 30 ? 0.5 : 0.1),
    why: p => p.lastInboundDaysAgo == null ? 'no inbound messages' : `last replied ${p.lastInboundDaysAgo}d ago`
  },
  {
    key: 'loyalty', weight: 10,
    score: p => ({ platinum: 1, gold: 0.8, silver: 0.5, bronze: 0.2 }[p.loyaltyTier] ?? 0.2),
    why: p => `loyalty tier ${p.loyaltyTier || 'bronze'}`
  },
  {
    key: 'subscriber', weight: 10,
    score: p => p.hasActiveSubscription ? 1 : 0,
    why: p => p.hasActiveSubscription ? 'active subscriber' : 'no active subscription'
  }
];

let BANDS = [
  { band: 'hot',  min: 70 },
  { band: 'warm', min: 40 },
  { band: 'cold', min: 0 }
];

function configureRules(rules) { if (Array.isArray(rules) && rules.length) RULES = rules; return RULES; }
function configureBands(bands) { if (Array.isArray(bands) && bands.length) BANDS = bands.slice().sort((a,b)=>b.min-a.min); return BANDS; }

function bandFor(score) {
  for (const b of BANDS) if (score >= b.min) return b.band;
  return BANDS[BANDS.length - 1]?.band || 'cold';
}

/**
 * Score one Customer 360 profile.
 * @returns {{ score:number, band:string, breakdown:Array, reasons:string[] }}
 */
function scoreProfile(profile) {
  if (!profile || typeof profile !== 'object') throw new Error('profile required');
  const totalWeight = RULES.reduce((s, r) => s + r.weight, 0) || 1;
  let weighted = 0;
  const breakdown = [];
  for (const r of RULES) {
    let s = 0;
    try { s = Math.max(0, Math.min(1, Number(r.score(profile)) || 0)); } catch { s = 0; }
    const contribution = Math.round((s * r.weight) * 10) / 10;
    weighted += s * r.weight;
    breakdown.push({ key: r.key, fired: s, weight: r.weight, contribution, why: safeWhy(r, profile) });
  }
  const score = Math.round((weighted / totalWeight) * 100);
  const band = bandFor(score);
  const reasons = breakdown
    .filter(b => b.fired > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(b => b.why);
  return { score, band, breakdown, reasons };
}

function safeWhy(rule, profile) {
  try { return rule.why ? rule.why(profile) : rule.key; } catch { return rule.key; }
}

/** Score many profiles and return them sorted hottest-first (for a sales worklist). */
function rankProfiles(profiles = []) {
  return (Array.isArray(profiles) ? profiles : [])
    .map(p => ({ key: p.key, name: p.name, ...scoreProfile(p) }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { configureRules, configureBands, scoreProfile, rankProfiles, bandFor };
