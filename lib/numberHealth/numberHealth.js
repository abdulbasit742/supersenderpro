// lib/numberHealth/numberHealth.js
// ────────────────────────────────────────────────────────────────────
// WhatsApp Number Health + Ban-Risk Monitor. The whole business rides on the
// number staying alive. WhatsApp bans numbers that ramp volume too fast, get
// blocked/reported, or send to people who don\'t engage. This tracks per-number
// activity, scores ban-risk 0-100, and — most usefully — recommends a SAFE daily
// send cap (account-age-aware warmup), so you grow volume without getting nuked.
//
// Scoring + caps are fully deterministic + explainable; the AI Brain Bridge
// (self-hosted Ollama) only phrases the advisory. Daily counters are file-backed.
// Pairs with send-time (#21) anti-ban spread + copywriter (#13) spam lint.
// Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[numberHealth] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.NUMBER_HEALTH_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'number_health');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const file = (storeId) => path.join(DATA_DIR, `${storeId}_numbers.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[numberHealth] write failed:', e.message); } }

const DEFAULT_CONFIG = {
  // warmup ramp: max sends/day by account age in days (interpolated)
  warmup: [ { age: 0, cap: 50 }, { age: 7, cap: 250 }, { age: 14, cap: 600 }, { age: 30, cap: 1500 }, { age: 60, cap: 5000 }, { age: 90, cap: 10000 } ],
  maxBlockRate: 0.02,    // > this fraction of recipients blocking = danger
  maxOptOutRate: 0.03,
  minReplyRate: 0.02,    // very low engagement looks spammy
  riskHoldAbove: 70      // advise pausing sends above this risk
};
function getConfig(storeId) { return readJSON(file(storeId) + '.cfg', { ...DEFAULT_CONFIG }) || { ...DEFAULT_CONFIG }; }
function setConfig(storeId, updates = {}) { const m = { ...getConfig(storeId), ...updates }; writeJSON(file(storeId) + '.cfg', m); return m; }

function readNums(storeId) { return readJSON(file(storeId), {}); }
function writeNums(storeId, d) { writeJSON(file(storeId), d); }

function today() { return new Date().toISOString().slice(0, 10); }

function acct(nums, number) {
  return nums[number] || { number, createdAt: Date.now(), daily: {}, totals: { sent: 0, delivered: 0, read: 0, replied: 0, blocked: 0, optOut: 0 } };
}

/** Register a number (sets its account-age clock). Idempotent. */
function register({ storeId = 'default_store', number, createdAt } = {}) {
  if (!number) throw new Error('number is required');
  const nums = readNums(storeId);
  const a = acct(nums, number);
  if (createdAt) a.createdAt = new Date(createdAt).getTime();
  nums[number] = a; writeNums(storeId, nums);
  return { number, createdAt: a.createdAt, ageDays: ageDays(a) };
}

function ageDays(a) { return Math.max(0, Math.floor((Date.now() - (a.createdAt || Date.now())) / 86400000)); }

/** Record an event for a number. type: sent|delivered|read|replied|blocked|optOut. */
function event({ storeId = 'default_store', number, type, count = 1 } = {}) {
  if (!number || !type) throw new Error('number and type are required');
  const valid = ['sent', 'delivered', 'read', 'replied', 'blocked', 'optOut'];
  if (!valid.includes(type)) throw new Error('invalid type');
  const nums = readNums(storeId);
  const a = acct(nums, number);
  const d = today();
  a.daily[d] = a.daily[d] || { sent: 0, delivered: 0, read: 0, replied: 0, blocked: 0, optOut: 0 };
  a.daily[d][type] += count;
  a.totals[type] = (a.totals[type] || 0) + count;
  // prune daily older than 60 days
  const keep = {}; const cutoff = Date.now() - 60 * 86400000;
  for (const day of Object.keys(a.daily)) { if (new Date(day).getTime() >= cutoff) keep[day] = a.daily[day]; }
  a.daily = keep;
  nums[number] = a; writeNums(storeId, nums);
  return { number, type, today: a.daily[d] };
}

// ── Warmup cap (interpolated by account age) ───────────────────────────
function warmupCap(ageInDays, warmup) {
  const pts = [...warmup].sort((a, b) => a.age - b.age);
  if (ageInDays <= pts[0].age) return pts[0].cap;
  if (ageInDays >= pts[pts.length - 1].age) return pts[pts.length - 1].cap;
  for (let i = 1; i < pts.length; i++) {
    if (ageInDays <= pts[i].age) {
      const lo = pts[i - 1], hi = pts[i];
      const frac = (ageInDays - lo.age) / (hi.age - lo.age);
      return Math.round(lo.cap + (hi.cap - lo.cap) * frac);
    }
  }
  return pts[pts.length - 1].cap;
}

function recentRates(a, days = 7) {
  const cutoff = Date.now() - days * 86400000;
  let sent = 0, delivered = 0, replied = 0, blocked = 0, optOut = 0;
  for (const day of Object.keys(a.daily)) {
    if (new Date(day).getTime() < cutoff) continue;
    const x = a.daily[day]; sent += x.sent; delivered += x.delivered; replied += x.replied; blocked += x.blocked; optOut += x.optOut;
  }
  return {
    sent, delivered, replied, blocked, optOut,
    blockRate: sent ? blocked / sent : 0,
    optOutRate: sent ? optOut / sent : 0,
    replyRate: delivered ? replied / delivered : 0
  };
}

/**
 * Ban-risk score 0-100 (higher = riskier) + reasons. Deterministic.
 */
function riskScore(a, cfg) {
  const age = ageDays(a);
  const r = recentRates(a, 7);
  const reasons = [];
  let risk = 0;

  // young account sending a lot = the #1 ban cause
  const cap = warmupCap(age, cfg.warmup);
  const todayCount = (a.daily[today()] || {}).sent || 0;
  if (todayCount > cap) { const over = Math.min(40, Math.round((todayCount / cap - 1) * 40)); risk += 40 + 0; reasons.push(`today\'s sends ${todayCount} exceed safe cap ${cap} for a ${age}d-old number (+${40})`); }
  else if (todayCount > cap * 0.8) { risk += 10; reasons.push(`approaching daily cap (${todayCount}/${cap}) (+10)`); }

  // block rate
  if (r.blockRate > cfg.maxBlockRate) { const p = Math.min(30, Math.round((r.blockRate / cfg.maxBlockRate) * 15)); risk += p; reasons.push(`block rate ${(r.blockRate * 100).toFixed(1)}% over ${(cfg.maxBlockRate * 100)}% (+${p})`); }
  // opt-out rate
  if (r.optOutRate > cfg.maxOptOutRate) { const p = Math.min(20, Math.round((r.optOutRate / cfg.maxOptOutRate) * 10)); risk += p; reasons.push(`opt-out rate ${(r.optOutRate * 100).toFixed(1)}% high (+${p})`); }
  // low engagement
  if (r.delivered >= 50 && r.replyRate < cfg.minReplyRate) { risk += 15; reasons.push(`very low reply rate (${(r.replyRate * 100).toFixed(1)}%) looks spammy (+15)`); }
  // brand-new account at all
  if (age < 3) { risk += 10; reasons.push('account < 3 days old (+10)'); }

  risk = Math.max(0, Math.min(100, Math.round(risk)));
  const band = risk >= cfg.riskHoldAbove ? 'critical' : risk >= 45 ? 'high' : risk >= 20 ? 'moderate' : 'low';
  return { score: risk, band, ageDays: age, dailyCap: cap, sentToday: todayCount, remainingToday: Math.max(0, cap - todayCount), rates7d: r, reasons };
}

/** Can this number safely send `n` more messages today? */
function canSend({ storeId = 'default_store', number, count = 1 } = {}) {
  if (!number) throw new Error('number is required');
  const nums = readNums(storeId); const a = acct(nums, number); const cfg = getConfig(storeId);
  const s = riskScore(a, cfg);
  const allowed = s.band !== 'critical' && (s.sentToday + count) <= s.dailyCap;
  return { allowed, remainingToday: s.remainingToday, dailyCap: s.dailyCap, band: s.band, risk: s.score, reason: s.band === 'critical' ? 'risk critical — pause sends' : ((s.sentToday + count) > s.dailyCap ? 'would exceed safe daily cap' : 'ok') };
}

async function status({ storeId = 'default_store', number, withAdvisory = true } = {}) {
  if (!number) throw new Error('number is required');
  const nums = readNums(storeId); const a = acct(nums, number); const cfg = getConfig(storeId);
  const s = riskScore(a, cfg);
  let advisory = null, source = 'none';
  if (withAdvisory) {
    if (!processPrompt) { advisory = templateAdvisory(s); source = 'fallback'; }
    else {
      try {
        const raw = await processPrompt(['In ONE line, advise a WhatsApp sender on their number health.', `Risk ${s.score}/100 (${s.band}), age ${s.ageDays}d, sent today ${s.sentToday}/${s.dailyCap}. Issues: ${s.reasons.join('; ') || 'none'}.`, 'Be practical. Return ONLY the advice.'].join('\n'), { model: MODEL() });
        advisory = (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) ? templateAdvisory(s) : String(raw).trim();
        source = advisory && !/\[AI Assist\]/.test(advisory) ? 'ollama' : 'fallback';
      } catch { advisory = templateAdvisory(s); source = 'fallback'; }
    }
  }
  return { number, ...s, advisory, source };
}

function templateAdvisory(s) {
  if (s.band === 'critical') return `\u26d4 Pause broadcasts. Risk ${s.score}/100. ${s.reasons[0] || ''} Let the number cool down and fix engagement first.`;
  if (s.band === 'high') return `\u26a0\ufe0f High risk (${s.score}). Slow down: stay well under ${s.dailyCap}/day and improve targeting.`;
  if (s.band === 'moderate') return `\ud83d\udfe1 Moderate risk (${s.score}). You can send up to ~${s.remainingToday} more today; keep content non-spammy.`;
  return `\u2705 Healthy (${s.score}). Safe to send ~${s.remainingToday} more today (cap ${s.dailyCap}).`;
}

function listNumbers({ storeId = 'default_store' } = {}) {
  const nums = readNums(storeId); const cfg = getConfig(storeId);
  return Object.values(nums).map(a => { const s = riskScore(a, cfg); return { number: a.number, ageDays: s.ageDays, risk: s.score, band: s.band, sentToday: s.sentToday, dailyCap: s.dailyCap }; })
    .sort((x, y) => y.risk - x.risk);
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL() }; }

module.exports = { register, event, status, canSend, listNumbers, getConfig, setConfig, health, _internal: { warmupCap, riskScore, recentRates, ageDays, templateAdvisory, DEFAULT_CONFIG } };
