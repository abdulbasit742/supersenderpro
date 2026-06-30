// lib/broadcastAnalyzer/broadcastAnalyzer.js
// ────────────────────────────────────────────────────────────────────
// AI Broadcast Performance Analyzer. After a campaign goes out, this turns raw
// counts into an answer: how did it do, WHY, and what should the next one be.
//   - funnel rates: delivered / read / replied / converted / opt-out
//   - a 0-100 performance grade vs sensible benchmarks (+ rolling history)
//   - issue detection: high opt-out, low read, weak reply/convert, list fatigue
//   - AI Brain Bridge (Ollama) writes the plain-language verdict + next-campaign
//     recommendation; deterministic analysis is the always-on fallback.
//
// File-backed campaign history. Pairs with the copywriter (#13) anti-ban lint
// and the send-time optimizer (#21). Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[broadcastAnalyzer] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.BROADCAST_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'broadcast_analytics');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const histFile = (storeId) => path.join(DATA_DIR, `${storeId}_history.json`);

function readHist(storeId) { try { const f = histFile(storeId); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []; } catch { return []; } }
function writeHist(storeId, d) { try { fs.writeFileSync(histFile(storeId), JSON.stringify(d.slice(-200), null, 2)); } catch (e) { console.error('[broadcastAnalyzer] write failed:', e.message); } }

// Sensible WhatsApp broadcast benchmarks (fractions of delivered, except optOut of sent).
const BENCH = { deliveredRate: 0.95, readRate: 0.55, replyRate: 0.08, convertRate: 0.02, optOutRate: 0.01 };

function rate(n, d) { return d > 0 ? +(n / d).toFixed(4) : 0; }

function computeFunnel(m) {
  const sent = m.sent || 0;
  const delivered = m.delivered != null ? m.delivered : sent;
  const read = m.read || 0;
  const replied = m.replied || 0;
  const converted = m.converted || 0;
  const optOuts = m.optOuts || 0;
  return {
    sent, delivered, read, replied, converted, optOuts,
    deliveredRate: rate(delivered, sent),
    readRate: rate(read, delivered),
    replyRate: rate(replied, delivered),
    convertRate: rate(converted, delivered),
    optOutRate: rate(optOuts, sent)
  };
}

// 0-100 grade: weighted ratio of each rate vs its benchmark (capped), minus an
// opt-out penalty. Explainable and deterministic.
function grade(f) {
  const score = (val, bench, weight) => Math.min(1, bench ? val / bench : 0) * weight;
  let g = 0;
  g += score(f.deliveredRate, BENCH.deliveredRate, 15);
  g += score(f.readRate, BENCH.readRate, 30);
  g += score(f.replyRate, BENCH.replyRate, 30);
  g += score(f.convertRate, BENCH.convertRate, 25);
  // opt-out penalty: every 1% over benchmark removes ~10 pts
  const optPenalty = Math.max(0, (f.optOutRate - BENCH.optOutRate)) * 1000;
  g = Math.max(0, Math.min(100, Math.round(g - optPenalty)));
  const band = g >= 75 ? 'excellent' : g >= 55 ? 'good' : g >= 35 ? 'fair' : 'poor';
  return { score: g, band };
}

function detectIssues(f) {
  const issues = [];
  if (f.sent > 0 && f.deliveredRate < 0.85) issues.push({ key: 'low_delivery', msg: 'Low delivery rate, possible number health / blocked recipients.' });
  if (f.readRate < 0.4 && f.delivered >= 20) issues.push({ key: 'low_read', msg: 'Low read rate, send-time or opening hook may be off.' });
  if (f.readRate >= 0.5 && f.replyRate < 0.03 && f.delivered >= 20) issues.push({ key: 'weak_cta', msg: 'People read but did not reply, weak or missing call-to-action.' });
  if (f.convertRate < 0.005 && f.replied > 5) issues.push({ key: 'reply_no_convert', msg: 'Replies are not converting, offer or follow-up needs work.' });
  if (f.optOutRate > BENCH.optOutRate * 2) issues.push({ key: 'high_optout', msg: 'High opt-out rate, message felt spammy or list is fatigued.' });
  return issues;
}

function rollingAverages(storeId) {
  const hist = readHist(storeId);
  if (!hist.length) return null;
  const last = hist.slice(-10);
  const avg = (k) => +(last.reduce((a, h) => a + (h.funnel ? h.funnel[k] : 0), 0) / last.length).toFixed(4);
  return { readRate: avg('readRate'), replyRate: avg('replyRate'), convertRate: avg('convertRate'), optOutRate: avg('optOutRate'), campaigns: last.length };
}

async function aiVerdict({ name, funnel, graded, issues, rolling, messageText }) {
  if (!processPrompt) return null;
  const prompt = [
    'You are a WhatsApp marketing analyst. Given one campaign\'s metrics, write a SHORT verdict + the single best next action.',
    `Campaign: ${name || 'untitled'}. Grade: ${graded.score}/100 (${graded.band}).`,
    `Funnel: ${JSON.stringify(funnel)}`,
    issues.length ? `Detected issues: ${issues.map(i => i.msg).join('; ')}` : 'No major issues detected.',
    rolling ? `Rolling avg (last ${rolling.campaigns}): read ${rolling.readRate}, reply ${rolling.replyRate}, convert ${rolling.convertRate}.` : '',
    messageText ? `The message sent was: "${String(messageText).slice(0, 300)}"` : '',
    '',
    'Answer in 3-4 lines, then a final line "NEXT: <one concrete recommendation for the next broadcast>". No fluff.'
  ].filter(Boolean).join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    return String(raw).trim();
  } catch (err) { console.warn('[broadcastAnalyzer] verdict failed:', err.message); return null; }
}

function templateVerdict(graded, issues, funnel) {
  const lines = [`Grade ${graded.score}/100 (${graded.band}).`,
    `Read ${Math.round(funnel.readRate * 100)}%, reply ${Math.round(funnel.replyRate * 100)}%, convert ${Math.round(funnel.convertRate * 100)}%, opt-out ${Math.round(funnel.optOutRate * 100)}%.`];
  if (issues.length) lines.push('Issues: ' + issues.map(i => i.msg).join(' '));
  const nextMap = {
    low_delivery: 'Warm up the number and clean the list before the next send.',
    low_read: 'Try a stronger opening line and send at the audience\'s best hour.',
    weak_cta: 'Add a single clear call-to-action (e.g. "Reply YES").',
    reply_no_convert: 'Tighten the offer and follow up replies faster.',
    high_optout: 'Reduce frequency and tighten targeting; lint the copy for spam.'
  };
  const next = issues.length ? nextMap[issues[0].key] : 'Repeat what worked; test one new hook on a small segment.';
  lines.push('NEXT: ' + next);
  return lines.join('\n');
}

/**
 * Analyze one campaign\'s metrics. Optionally records to history.
 * @param {object} args { storeId?, name?, metrics:{sent,delivered,read,replied,converted,optOuts}, messageText?, save? }
 * @returns {Promise<{ funnel, grade, issues, rolling, verdict, source }>}
 */
async function analyze({ storeId = 'default_store', name, metrics = {}, messageText, save = true } = {}) {
  if (!metrics || (metrics.sent == null && metrics.delivered == null)) throw new Error('metrics with at least sent or delivered is required');
  const funnel = computeFunnel(metrics);
  const graded = grade(funnel);
  const issues = detectIssues(funnel);
  const rolling = rollingAverages(storeId);

  let verdict = await aiVerdict({ name, funnel, graded, issues, rolling, messageText });
  let source = 'ollama';
  if (!verdict) { verdict = templateVerdict(graded, issues, funnel); source = 'fallback'; }

  const record = { name: name || null, funnel, grade: graded, issues, verdict, source, ts: Date.now() };
  if (save) { const h = readHist(storeId); h.push(record); writeHist(storeId, h); }
  return { name: name || null, funnel, grade: graded, issues, rolling, verdict, source };
}

function history({ storeId = 'default_store', limit = 30 } = {}) { return readHist(storeId).slice(-limit).reverse(); }

function compare({ storeId = 'default_store', limit = 10 } = {}) {
  const hist = readHist(storeId).slice(-limit);
  if (!hist.length) return { campaigns: 0 };
  const best = hist.reduce((a, b) => (b.grade.score > a.grade.score ? b : a));
  const worst = hist.reduce((a, b) => (b.grade.score < a.grade.score ? b : a));
  const avg = +(hist.reduce((a, h) => a + h.grade.score, 0) / hist.length).toFixed(1);
  return { campaigns: hist.length, avgGrade: avg, best: { name: best.name, score: best.grade.score }, worst: { name: worst.name, score: worst.grade.score } };
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), benchmarks: BENCH }; }

module.exports = { analyze, history, compare, health, _internal: { computeFunnel, grade, detectIssues, templateVerdict, BENCH } };
