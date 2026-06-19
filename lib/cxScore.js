// cxScore.js — AI Conversation Quality (CX) Score (Wati "AI CX Score" style).
// Grades each customer conversation 0-100 (A–F) using three weighted signals:
//   • Responsiveness — gaps between customer messages and our replies
//   • Sentiment      — language tone across the thread
//   • Resolution     — whether the conversation reached a positive/closed outcome
// Gives managers an at-a-glance quality grade per chat and a store-wide CX overview.

const storeCRM = require('./storeCRM');

const POSITIVE = ['thanks', 'thank you', 'shukria', 'great', 'good', 'perfect', 'done', 'received', 'ok', 'okay', 'best', 'love', 'mil gaya', 'zabardast'];
const NEGATIVE = ['angry', 'slow', 'late', 'refund', 'bad', 'scam', 'bakwas', 'worst', 'kharab', 'problem', 'issue', 'not working', 'fraud', 'wait', 'intezar'];
const RESOLUTION = ['order', 'completed', 'delivered', 'paid', 'payment', 'thank you', 'shukria', 'done', 'received'];

function scoreConversation(storeId, phone) {
  const customer = storeCRM.getCustomer(storeId, phone);
  if (!customer) return null;

  const interactions = (storeCRM.getCustomerInteractions(storeId, phone, 100) || []).slice().reverse();
  if (interactions.length === 0) {
    return { phone, score: null, grade: 'N/A', reason: 'No conversation history yet.' };
  }

  let posHits = 0, negHits = 0, resolutionHit = false;
  const texts = [];
  interactions.forEach(i => {
    const t = (i.details || i.message || i.product || '').toLowerCase();
    if (!t) return;
    texts.push(t);
    POSITIVE.forEach(w => { if (t.includes(w)) posHits++; });
    NEGATIVE.forEach(w => { if (t.includes(w)) negHits++; });
    RESOLUTION.forEach(w => { if (t.includes(w)) resolutionHit = true; });
  });

  // 1. Sentiment component (0-40)
  const sentimentRaw = posHits - negHits;
  let sentiment = 20 + sentimentRaw * 6;
  sentiment = Math.max(0, Math.min(40, sentiment));

  // 2. Responsiveness component (0-30) — based on time gaps between logged interactions
  let respScore = 30;
  let gaps = [];
  for (let k = 1; k < interactions.length; k++) {
    const prev = new Date(interactions[k - 1].ts || interactions[k - 1].timestamp || 0).getTime();
    const cur = new Date(interactions[k].ts || interactions[k].timestamp || 0).getTime();
    if (prev && cur && cur > prev) gaps.push((cur - prev) / 60000); // minutes
  }
  if (gaps.length) {
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avgGap <= 5) respScore = 30;
    else if (avgGap <= 30) respScore = 24;
    else if (avgGap <= 120) respScore = 16;
    else if (avgGap <= 720) respScore = 8;
    else respScore = 4;
  }

  // 3. Resolution component (0-30)
  let resolution = resolutionHit ? 22 : 8;
  if ((customer.totalOrders || 0) > 0) resolution += 8;
  resolution = Math.min(30, resolution);

  let score = Math.round(sentiment + respScore + resolution);
  score = Math.max(0, Math.min(100, score));

  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 45) grade = 'D';
  else grade = 'F';

  return {
    phone,
    name: customer.name || '',
    score,
    grade,
    components: { sentiment, responsiveness: respScore, resolution },
    signals: { positiveHits: posHits, negativeHits: negHits, resolved: resolutionHit, messages: interactions.length },
    scoredAt: new Date().toISOString()
  };
}

/**
 * Store-wide CX overview for dashboards.
 */
function getStoreCXOverview(storeId) {
  const customers = storeCRM.getAllCustomers(storeId) || [];
  const scored = customers
    .map(c => scoreConversation(storeId, c.phone))
    .filter(s => s && typeof s.score === 'number');

  const gradeDist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  scored.forEach(s => { gradeDist[s.grade] = (gradeDist[s.grade] || 0) + 1; });

  const avg = scored.length ? Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length) : 0;
  const atRisk = scored.filter(s => s.score < 45).sort((a, b) => a.score - b.score).slice(0, 20);

  return {
    conversationsScored: scored.length,
    avgCXScore: avg,
    gradeDistribution: gradeDist,
    atRiskConversations: atRisk
  };
}

module.exports = { scoreConversation, getStoreCXOverview };
