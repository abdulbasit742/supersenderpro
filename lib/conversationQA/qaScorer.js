// lib/conversationQA/qaScorer.js
// Feature #100 - AI Conversation QA Scorer
// Scores bot + human WhatsApp conversations against a deterministic quality rubric.
// Deterministic core works with NO model. Optional Ollama generates coaching tips.
// Zero new deps: Node built-ins + global fetch only. File-backed under data/.

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'conversationQA');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SCORES_FILE)) fs.writeFileSync(SCORES_FILE, '[]');
}

function loadScores() {
  ensureStore();
  try { return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); } catch { return []; }
}

function saveScore(rec) {
  const all = loadScores();
  all.push(rec);
  fs.writeFileSync(SCORES_FILE, JSON.stringify(all, null, 2));
  return rec;
}

// ---- Rubric (deterministic, weighted 0-100) ----
// A conversation = ordered array of messages:
//   { role: 'customer'|'agent'|'bot', text, ts } (ts = epoch ms)

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 1) Response time: median agent/bot reply latency to customer messages.
function scoreResponseTime(msgs) {
  const latencies = [];
  for (let i = 1; i < msgs.length; i++) {
    const prev = msgs[i - 1], cur = msgs[i];
    if (prev.role === 'customer' && cur.role !== 'customer' && prev.ts && cur.ts) {
      latencies.push((cur.ts - prev.ts) / 1000); // seconds
    }
  }
  const med = median(latencies);
  // <=30s = 100, >=600s (10min) = 0, linear between.
  let pts = 100;
  if (med > 30) pts = Math.max(0, 100 - ((med - 30) / (600 - 30)) * 100);
  return { points: Math.round(pts), medianSeconds: Math.round(med), replies: latencies.length };
}

// 2) Resolution: did conversation end with a customer-positive / closed signal?
const RESOLVE_HINTS = ['thanks', 'thank you', 'shukriya', 'ok done', 'got it', 'received', 'mil gaya', 'theek hai', 'solved', 'resolved'];
const UNRESOLVED_HINTS = ['still', 'not working', 'problem', 'issue', 'kab', 'when will', 'abhi tak nahi', 'nahi mila'];
function scoreResolution(msgs) {
  const lastCust = [...msgs].reverse().find(m => m.role === 'customer');
  const txt = (lastCust && lastCust.text || '').toLowerCase();
  let pts = 60; // neutral default
  if (RESOLVE_HINTS.some(h => txt.includes(h))) pts = 100;
  else if (UNRESOLVED_HINTS.some(h => txt.includes(h))) pts = 20;
  return { points: pts, lastCustomerText: lastCust ? lastCust.text : null };
}

// 3) Tone: politeness / greeting / no rude tokens (deterministic lexicon).
const POLITE = ['please', 'thanks', 'thank you', 'welcome', 'sorry', 'apologi', 'shukriya', 'meharbani', 'ji'];
const RUDE = ['stupid', 'idiot', 'shut up', 'bakwas', 'pagal', 'useless'];
function scoreTone(msgs) {
  const agent = msgs.filter(m => m.role !== 'customer').map(m => (m.text || '').toLowerCase());
  if (!agent.length) return { points: 60, polite: 0, rude: 0 };
  let polite = 0, rude = 0;
  for (const t of agent) {
    if (POLITE.some(p => t.includes(p))) polite++;
    if (RUDE.some(r => t.includes(r))) rude++;
  }
  let pts = 70 + Math.min(30, polite * 10) - rude * 40;
  pts = Math.max(0, Math.min(100, pts));
  return { points: Math.round(pts), polite, rude };
}

// 4) Escalation handling: if customer asked for human / showed anger, was it escalated?
const ESCALATE_TRIGGER = ['human', 'agent', 'manager', 'complaint', 'refund', 'insaan', 'banda', 'shikayat'];
function scoreEscalation(msgs) {
  const custWanted = msgs.some(m => m.role === 'customer' && ESCALATE_TRIGGER.some(e => (m.text || '').toLowerCase().includes(e)));
  const humanReplied = msgs.some(m => m.role === 'agent');
  if (!custWanted) return { points: 100, triggered: false, escalated: humanReplied };
  return { points: humanReplied ? 100 : 30, triggered: true, escalated: humanReplied };
}

const WEIGHTS = { responseTime: 0.30, resolution: 0.30, tone: 0.20, escalation: 0.20 };

function scoreConversation(conversation, opts = {}) {
  const msgs = Array.isArray(conversation && conversation.messages) ? conversation.messages : (Array.isArray(conversation) ? conversation : []);
  if (!msgs.length) throw new Error('conversation.messages required');

  const responseTime = scoreResponseTime(msgs);
  const resolution = scoreResolution(msgs);
  const tone = scoreTone(msgs);
  const escalation = scoreEscalation(msgs);

  const overall = Math.round(
    responseTime.points * WEIGHTS.responseTime +
    resolution.points * WEIGHTS.resolution +
    tone.points * WEIGHTS.tone +
    escalation.points * WEIGHTS.escalation
  );

  // CSAT prediction: map overall to a 1-5 scale.
  const csatPredicted = Math.max(1, Math.min(5, Math.round(1 + (overall / 100) * 4)));

  const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : overall >= 40 ? 'D' : 'F';

  return {
    conversationId: (conversation && conversation.id) || opts.conversationId || null,
    tenantId: (conversation && conversation.tenantId) || opts.tenantId || null,
    overall,
    grade,
    csatPredicted,
    breakdown: { responseTime, resolution, tone, escalation },
    weights: WEIGHTS,
    messageCount: msgs.length,
    scoredAt: Date.now()
  };
}

// Deterministic coaching tips (used as fallback + always available).
function deterministicTips(result) {
  const tips = [];
  const b = result.breakdown;
  if (b.responseTime.points < 70) tips.push(`Reply faster: median reply was ${b.responseTime.medianSeconds}s. Aim under 30s.`);
  if (b.resolution.points < 70) tips.push('Confirm the issue is solved before closing. Ask "kuch aur chahiye?"');
  if (b.tone.points < 70) tips.push('Use more polite tokens (please/thanks/shukriya). Avoid blunt one-word replies.');
  if (b.escalation.points < 70) tips.push('Customer asked for a human but no agent stepped in. Escalate quickly next time.');
  if (!tips.length) tips.push('Solid conversation. Keep it up.');
  return tips;
}

// Optional Ollama-generated coaching. Graceful fallback to deterministic tips.
async function aiCoaching(result, conversation, opts = {}) {
  const tips = deterministicTips(result);
  if (opts.useModel === false) return { tips, source: 'deterministic' };
  try {
    // Lazy require so smoke test never needs the model.
    let aiBrain;
    try { aiBrain = require('../../ai/aiBrain'); } catch { aiBrain = null; }
    if (!aiBrain || typeof aiBrain.processPrompt !== 'function') return { tips, source: 'deterministic' };
    const prompt = `You are a WhatsApp support QA coach. Conversation scored ${result.overall}/100 (grade ${result.grade}). ` +
      `Breakdown: ${JSON.stringify(result.breakdown)}. Give 3 short, actionable coaching tips in Roman Urdu. One per line, no numbering.`;
    const out = await aiBrain.processPrompt(prompt, { maxTokens: 300, temperature: 0.4 });
    const text = (out && (out.text || out.content || out.response)) || (typeof out === 'string' ? out : '');
    const aiTips = String(text).split('\n').map(s => s.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean).slice(0, 3);
    if (aiTips.length) return { tips: aiTips, source: 'ollama' };
  } catch (e) {
    // fall through to deterministic
  }
  return { tips, source: 'deterministic' };
}

async function scoreAndCoach(conversation, opts = {}) {
  const result = scoreConversation(conversation, opts);
  const coaching = await aiCoaching(result, conversation, opts);
  result.coaching = coaching;
  if (opts.persist !== false) saveScore(result);
  return result;
}

function listScores(filter = {}) {
  let all = loadScores();
  if (filter.tenantId) all = all.filter(s => s.tenantId === filter.tenantId);
  if (filter.minOverall != null) all = all.filter(s => s.overall >= filter.minOverall);
  if (filter.grade) all = all.filter(s => s.grade === filter.grade);
  return all;
}

function aggregate(filter = {}) {
  const all = listScores(filter);
  if (!all.length) return { count: 0, avgOverall: 0, avgCsat: 0, grades: {} };
  const grades = {};
  let sum = 0, csat = 0;
  for (const s of all) {
    grades[s.grade] = (grades[s.grade] || 0) + 1;
    sum += s.overall;
    csat += s.csatPredicted;
  }
  return { count: all.length, avgOverall: Math.round(sum / all.length), avgCsat: +(csat / all.length).toFixed(2), grades };
}

module.exports = {
  scoreConversation,
  scoreAndCoach,
  deterministicTips,
  aiCoaching,
  listScores,
  aggregate,
  WEIGHTS
};
