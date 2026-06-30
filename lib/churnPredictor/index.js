'use strict';
// AI Churn Predictor. Deterministic RFM+engagement risk scoring that works
// with NO model. Optional self-hosted Ollama enrichment writes a Roman-Urdu
// win-back note with graceful template fallback. Dry-run safe (never sends).
const cfg = require('./config');
const store = require('./store');

const DAY = 24 * 60 * 60 * 1000;

function maskPhone(p) {
  const s = String(p || '');
  if (s.length < 5) return '***';
  return s.slice(0, 3) + '****' + s.slice(-2);
}

function _clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

// Pure, explainable score. Higher = more likely to churn.
function scoreContact(c, now) {
  const w = cfg.weights;
  const last = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : 0;
  const daysSince = last ? Math.floor((now - last) / DAY) : 9999;
  // Recency: linear ramp, fully "risky" at 3x window.
  const recency = Math.min(1, daysSince / (cfg.recencyWindowDays * 3));
  // Frequency: more orders => less risk. 10+ orders ~ safe.
  const freq = 1 - Math.min(1, (Number(c.orderCount) || 0) / 10);
  // Monetary: higher lifetime value => less risk. 50k PKR ~ safe.
  const money = 1 - Math.min(1, (Number(c.lifetimeValue) || 0) / 50000);
  // Engagement: replies in last window => less risk.
  const eng = 1 - Math.min(1, (Number(c.recentReplies) || 0) / 5);
  const raw = recency * w.recency + freq * w.frequency + money * w.monetary + eng * w.engagement;
  const score = _clamp(raw);
  const reasons = [];
  if (daysSince >= cfg.recencyWindowDays) reasons.push(daysSince + ' din se khamosh');
  if ((Number(c.orderCount) || 0) <= 1) reasons.push('sirf ' + (c.orderCount || 0) + ' order');
  if ((Number(c.recentReplies) || 0) === 0) reasons.push('koi recent reply nahi');
  return { score, daysSince, reasons };
}

function tier(score) {
  if (score >= 80) return 'critical';
  if (score >= cfg.riskThreshold) return 'high';
  if (score >= 35) return 'watch';
  return 'healthy';
}

async function _modelNote(rows) {
  if (!cfg.useModel) return null;
  let resolver;
  try { resolver = require('../llmHub'); } catch {}
  if (!resolver) {
    try { resolver = require('../../ai/aiBrain'); } catch {}
  }
  if (!resolver) return null;
  const top = rows.slice(0, 5).map(r => `${maskPhone(r.phone)} risk=${r.score} (${r.reasons.join(', ') || 'low signal'})`).join('\n');
  const prompt = 'Tu ek WhatsApp commerce owner ka assistant hai. Neeche at-risk customers ki list hai. Har ek ke liye ek chhota, dostana Roman-Urdu win-back message likho (max 1 line, koi pushy discount mat thopo). List:\n' + top;
  try {
    if (typeof resolver.processPrompt === 'function') {
      const out = await resolver.processPrompt(prompt, { maxTokens: 400 });
      return typeof out === 'string' ? out : (out && out.text) || null;
    }
    if (typeof resolver.complete === 'function') {
      const out = await resolver.complete({ prompt, maxTokens: 400 });
      return (out && (out.text || out.content)) || null;
    }
  } catch { return null; }
  return null;
}

function _templateNote(r) {
  return 'Assalam o alaikum! Kaafi arsa hua aap se baat kiye. Koi nayi cheez chahiye to bata dein, hum hazir hain.';
}

async function predict(tenantId, opts = {}) {
  if (!tenantId) throw new Error('churnPredictor: tenantId is required');
  const now = opts.now || Date.now();
  const contacts = store.getContacts(tenantId);
  const rows = Object.values(contacts).map(c => {
    const s = scoreContact(c, now);
    return { phone: c.phone, score: s.score, daysSince: s.daysSince, reasons: s.reasons, tier: tier(s.score) };
  }).sort((a, b) => b.score - a.score);

  const atRisk = rows.filter(r => r.score >= cfg.riskThreshold);
  let aiNote = null;
  if (opts.enrich !== false && atRisk.length) aiNote = await _modelNote(atRisk);

  const flagged = atRisk.map(r => ({
    phoneMasked: maskPhone(r.phone),
    score: r.score,
    tier: r.tier,
    daysSince: r.daysSince,
    reasons: r.reasons,
    winBackDraft: aiNote ? null : _templateNote(r), // model note covers all if present
    dryRun: true
  }));

  const summary = {
    total: rows.length,
    atRisk: atRisk.length,
    critical: rows.filter(r => r.tier === 'critical').length,
    aiNote: aiNote || null,
    aiUsed: !!aiNote,
    generatedAt: new Date(now).toISOString()
  };

  if (opts.persist) store.saveFlags(tenantId, { summary, flagged });
  return { summary, flagged };
}

module.exports = { predict, scoreContact, tier, maskPhone, upsertContacts: store.upsertContacts };
