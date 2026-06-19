// leadScoring.js — Predictive Lead Scoring engine (HubSpot/Kommo style "Lead Prioritization").
// Calculates a 0-100 priority score for every contact using RFM (Recency, Frequency, Monetary)
// signals combined with engagement and pipeline-stage weighting, then buckets leads into
// 🔥 Hot / 🌤 Warm / ❄️ Cold so reps always work the highest-intent contacts first.

const storeCRM = require('./storeCRM');

const DAY = 86400000;

// Pipeline-stage intent weighting (higher = closer to purchase)
const STAGE_WEIGHT = {
  AWAITING_PAYMENT: 30,
  PROPOSAL_SENT: 22,
  QUALIFIED: 15,
  INBOX: 6,
  COMPLETED: 10, // already a customer — good for upsell
  LOST: 0
};

/**
 * Score a single lead 0-100.
 */
function computeLeadScore(storeId, phone) {
  const customer = storeCRM.getCustomer(storeId, phone);
  if (!customer) return null;

  const now = Date.now();
  let score = 0;
  const breakdown = {};

  // 1. Recency (max 25) — how recently they contacted us
  const last = customer.lastContact ? new Date(customer.lastContact).getTime() : 0;
  const daysSince = last ? (now - last) / DAY : 999;
  let recency = 0;
  if (daysSince <= 1) recency = 25;
  else if (daysSince <= 3) recency = 20;
  else if (daysSince <= 7) recency = 14;
  else if (daysSince <= 30) recency = 7;
  else recency = 2;
  breakdown.recency = recency;
  score += recency;

  // 2. Frequency (max 20) — number of logged interactions
  const interactions = storeCRM.getCustomerInteractions(storeId, phone, 200) || [];
  const freq = Math.min(20, interactions.length * 2);
  breakdown.frequency = freq;
  score += freq;

  // 3. Monetary (max 25) — total spent
  const spent = customer.totalSpent || 0;
  let monetary = 0;
  if (spent >= 50000) monetary = 25;
  else if (spent >= 20000) monetary = 20;
  else if (spent >= 5000) monetary = 14;
  else if (spent > 0) monetary = 8;
  breakdown.monetary = monetary;
  score += monetary;

  // 4. Pipeline stage intent (max 30)
  const stage = customer.pipelineStage || 'INBOX';
  const stageScore = STAGE_WEIGHT[stage] !== undefined ? STAGE_WEIGHT[stage] : 6;
  breakdown.stageIntent = stageScore;
  score += stageScore;

  // Penalty: opted out or blocked
  if (customer.promoOptIn === false) { score -= 10; breakdown.optOutPenalty = -10; }
  if (customer.status === 'blocked') { score -= 25; breakdown.blockedPenalty = -25; }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let bucket, label;
  if (score >= 70) { bucket = 'HOT'; label = '🔥 Hot'; }
  else if (score >= 40) { bucket = 'WARM'; label = '🌤 Warm'; }
  else { bucket = 'COLD'; label = '❄️ Cold'; }

  return { phone, name: customer.name || '', score, bucket, label, breakdown, stage, tier: customer.tier || 'Bronze' };
}

/**
 * Score & rank all leads in a store (descending by score).
 */
function scoreAllLeads(storeId) {
  const customers = storeCRM.getAllCustomers(storeId) || [];
  return customers
    .map(c => computeLeadScore(storeId, c.phone))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

/**
 * Get only the hottest leads (score >= threshold).
 */
function getHotLeads(storeId, threshold = 70, limit = 50) {
  return scoreAllLeads(storeId).filter(l => l.score >= threshold).slice(0, limit);
}

/**
 * Persist the computed score back onto the customer profile (for dashboards/sorting).
 */
function syncLeadScore(storeId, phone) {
  const result = computeLeadScore(storeId, phone);
  if (!result) return null;
  storeCRM.upsertCustomer(storeId, phone, {
    leadScore: result.score,
    leadBucket: result.bucket,
    leadScoredAt: new Date().toISOString()
  });
  return result;
}

/**
 * Distribution summary for analytics dashboards.
 */
function getScoreDistribution(storeId) {
  const all = scoreAllLeads(storeId);
  const dist = { HOT: 0, WARM: 0, COLD: 0 };
  all.forEach(l => { dist[l.bucket] += 1; });
  return {
    totalLeads: all.length,
    distribution: dist,
    avgScore: all.length ? Math.round(all.reduce((s, l) => s + l.score, 0) / all.length) : 0,
    topLead: all[0] || null
  };
}

module.exports = {
  computeLeadScore,
  scoreAllLeads,
  getHotLeads,
  syncLeadScore,
  getScoreDistribution
};
