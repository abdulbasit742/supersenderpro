// lib/loyalty/loyaltyEngine.js
// ────────────────────────────────────────────────────────────────────
// AI Loyalty & Rewards Engine. Repeat buyers are your cheapest revenue; a simple
// points + tiers program keeps them coming back. This tracks a per-contact
// points ledger, awards points per spend (with tier multipliers), supports
// redemption (never into negative), and uses the AI Brain Bridge (Ollama) to
// phrase a friendly nudge toward the next reachable reward.
//
// All points/tier/redemption math is deterministic (balances can never go
// negative; tiers are pure thresholds); the model only phrases messages.
// File-backed ledger + per-store config. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[loyalty] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.LOYALTY_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const CURRENCY = () => process.env.ORDER_CURRENCY || 'PKR';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'loyalty');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const ledgerFile = (storeId) => path.join(DATA_DIR, `${storeId}_ledger.json`);
const configFile = (storeId) => path.join(DATA_DIR, `${storeId}_config.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[loyalty] write failed:', e.message); } }

const DEFAULT_CONFIG = {
  pointsPerCurrency: 1,            // 1 point per 1 unit spent (before tier multiplier)
  redeemValuePerPoint: 0.5,       // each point is worth this much currency on redemption
  tiers: [
    { name: 'bronze',   minPoints: 0,     multiplier: 1.0 },
    { name: 'silver',   minPoints: 1000,  multiplier: 1.25 },
    { name: 'gold',     minPoints: 5000,  multiplier: 1.5 },
    { name: 'platinum', minPoints: 15000, multiplier: 2.0 }
  ],
  rewards: [
    { id: 'r1', points: 500,  label: `${''}5% off your next order` },
    { id: 'r2', points: 1500, label: 'Free delivery' },
    { id: 'r3', points: 3000, label: '15% off any item' }
  ]
};

function getConfig(storeId) { return readJSON(configFile(storeId), JSON.parse(JSON.stringify(DEFAULT_CONFIG))); }
function setConfig(storeId, updates = {}) {
  const cur = getConfig(storeId);
  const merged = { ...cur, ...updates };
  if (updates.tiers) merged.tiers = updates.tiers;
  if (updates.rewards) merged.rewards = updates.rewards;
  writeJSON(configFile(storeId), merged);
  return merged;
}

function readLedger(storeId) { return readJSON(ledgerFile(storeId), {}); }
function writeLedger(storeId, d) { writeJSON(ledgerFile(storeId), d); }

// ── Tier resolution (pure) ──────────────────────────────────────
function tierFor(points, tiers) {
  const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  let cur = sorted[0];
  for (const t of sorted) { if (points >= t.minPoints) cur = t; }
  const next = sorted.find(t => t.minPoints > points) || null;
  return { tier: cur, next, toNext: next ? next.minPoints - points : 0 };
}

function acct(storeId, phone) {
  const l = readLedger(storeId);
  return l[phone] || { phone, points: 0, lifetimePoints: 0, history: [] };
}

// ── Earn ────────────────────────────────────────────────────
/**
 * Award points for a purchase (or a manual grant). Tier multiplier applies to
 * spend-based earns. Returns the updated account + tier.
 */
function earn({ storeId = 'default_store', phone, spend, points, reason = 'purchase' } = {}) {
  if (!phone) throw new Error('phone is required');
  const cfg = getConfig(storeId);
  const ledger = readLedger(storeId);
  const a = ledger[phone] || { phone, points: 0, lifetimePoints: 0, history: [] };
  const { tier } = tierFor(a.points, cfg.tiers);

  let earned = 0;
  if (points != null) earned = Math.max(0, Math.round(points));
  else if (spend != null) earned = Math.max(0, Math.round(spend * cfg.pointsPerCurrency * (tier.multiplier || 1)));
  if (earned <= 0) return { ok: false, error: 'nothing to earn (provide spend or points)' };

  a.points += earned; a.lifetimePoints += earned;
  a.history.push({ type: 'earn', amount: earned, reason, ts: Date.now() });
  if (a.history.length > 200) a.history = a.history.slice(-200);
  ledger[phone] = a; writeLedger(storeId, ledger);
  const t = tierFor(a.points, cfg.tiers);
  return { ok: true, earned, balance: a.points, tier: t.tier.name, multiplier: tier.multiplier };
}

// ── Redeem (never negative) ───────────────────────────────────
function redeem({ storeId = 'default_store', phone, points, rewardId } = {}) {
  if (!phone) throw new Error('phone is required');
  const cfg = getConfig(storeId);
  const ledger = readLedger(storeId);
  const a = ledger[phone];
  if (!a) return { ok: false, error: 'no loyalty account' };

  let cost = points != null ? Math.round(points) : null;
  let label = null;
  if (rewardId) { const r = (cfg.rewards || []).find(x => x.id === rewardId); if (!r) return { ok: false, error: 'unknown reward' }; cost = r.points; label = r.label; }
  if (cost == null || cost <= 0) return { ok: false, error: 'points or rewardId required' };

  // HARD guard: cannot redeem more than the balance
  if (cost > a.points) return { ok: false, error: 'insufficient points', balance: a.points, needed: cost };

  a.points -= cost;
  a.history.push({ type: 'redeem', amount: -cost, reward: label || null, ts: Date.now() });
  ledger[phone] = a; writeLedger(storeId, ledger);
  const value = +(cost * cfg.redeemValuePerPoint).toFixed(2);
  return { ok: true, redeemed: cost, valueOff: value, currency: CURRENCY(), reward: label, balance: a.points };
}

// ── Balance / tier ─────────────────────────────────────────
function balance({ storeId = 'default_store', phone } = {}) {
  if (!phone) throw new Error('phone is required');
  const cfg = getConfig(storeId);
  const a = acct(storeId, phone);
  const t = tierFor(a.points, cfg.tiers);
  // affordable rewards
  const affordable = (cfg.rewards || []).filter(r => r.points <= a.points);
  const nextReward = (cfg.rewards || []).filter(r => r.points > a.points).sort((x, y) => x.points - y.points)[0] || null;
  return { phone, points: a.points, lifetimePoints: a.lifetimePoints, tier: t.tier.name, multiplier: t.tier.multiplier, nextTier: t.next ? t.next.name : null, pointsToNextTier: t.toNext, affordable, nextReward };
}

// ── AI nudge toward next reward ──────────────────────────────────
function templateNudge(bal) {
  if (bal.affordable && bal.affordable.length) {
    const r = bal.affordable[bal.affordable.length - 1];
    return `You have ${bal.points} points (${bal.tier})! \ud83c\udf89 You can redeem "${r.label}" right now. Want to use it?`;
  }
  if (bal.nextReward) {
    const need = bal.nextReward.points - bal.points;
    return `You\'re at ${bal.points} points (${bal.tier}). Just ${need} more to unlock "${bal.nextReward.label}" \ud83d\ude4c`;
  }
  return `You have ${bal.points} points (${bal.tier}). Thanks for being a loyal customer! \ud83d\ude4f`;
}

async function nudge({ storeId = 'default_store', phone } = {}) {
  const bal = balance({ storeId, phone });
  if (!processPrompt) return { ...bal, message: templateNudge(bal), source: 'fallback' };
  const prompt = [
    'Write ONE short, upbeat WhatsApp loyalty message. 1-2 lines.',
    `Customer has ${bal.points} points, tier ${bal.tier}.`,
    bal.affordable && bal.affordable.length ? `They can redeem now: ${bal.affordable.map(r => r.label).join(', ')}.` : '',
    bal.nextReward ? `Next reward: "${bal.nextReward.label}" at ${bal.nextReward.points} points (${bal.nextReward.points - bal.points} to go).` : '',
    'Encourage them warmly toward the next reward without being pushy. Return ONLY the message.'
  ].filter(Boolean).join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return { ...bal, message: templateNudge(bal), source: 'fallback' };
    return { ...bal, message: String(raw).trim().replace(/^"|"$/g, ''), source: 'ollama' };
  } catch { return { ...bal, message: templateNudge(bal), source: 'fallback' }; }
}

function leaderboard({ storeId = 'default_store', limit = 20 } = {}) {
  const l = readLedger(storeId);
  return Object.values(l).sort((a, b) => b.lifetimePoints - a.lifetimePoints).slice(0, limit)
    .map(a => ({ phone: a.phone, points: a.points, lifetimePoints: a.lifetimePoints }));
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), currency: CURRENCY() }; }

module.exports = { earn, redeem, balance, nudge, leaderboard, getConfig, setConfig, health, _internal: { tierFor, templateNudge, DEFAULT_CONFIG } };
