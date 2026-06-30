// lib/referral/referralEngine.js
// ────────────────────────────────────────────────────────────────────
// AI Referral Program Engine. Word-of-mouth is the cheapest acquisition there
// is, and on WhatsApp it\'s native (people forward things). This issues a unique
// referral code per advocate, tracks who they refer, and rewards BOTH sides when
// the referred person qualifies (e.g. first order) — with anti-abuse guards so
// it can\'t be gamed: no self-referral, one reward per referee, unique codes.
//
// All attribution + reward math is deterministic + auditable; the AI Brain
// Bridge (self-hosted Ollama) only phrases the share/invite message. Rewards are
// granted through the loyalty engine (#60) when present, else recorded as pending
// credits. File-backed. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[referral] aiBrain unavailable:', e.message); processPrompt = null; }

let loyalty = null;
try { loyalty = require('../loyalty/loyaltyEngine'); } catch { /* optional */ }

const MODEL = () => process.env.REFERRAL_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const CURRENCY = () => process.env.ORDER_CURRENCY || 'PKR';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'referral');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const codesFile = (storeId) => path.join(DATA_DIR, `${storeId}_codes.json`);
const refsFile = (storeId) => path.join(DATA_DIR, `${storeId}_referrals.json`);
const configFile = (storeId) => path.join(DATA_DIR, `${storeId}_config.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[referral] write failed:', e.message); } }

const DEFAULT_CONFIG = {
  advocateRewardPoints: 500,    // referrer gets this on a qualifying referral
  refereeRewardPoints: 250,     // the new customer gets this
  advocateRewardValue: 0,       // optional currency credit instead of/with points
  qualifyEvent: 'first_order',  // what counts as "qualified"
  maxRewardsPerAdvocate: 50,    // cap to prevent farming
  shareLinkBase: ''             // e.g. https://wa.me/<num>?text= ... (optional)
};
function getConfig(storeId) { return readJSON(configFile(storeId), { ...DEFAULT_CONFIG }); }
function setConfig(storeId, updates = {}) { const m = { ...getConfig(storeId), ...updates }; writeJSON(configFile(storeId), m); return m; }

function readCodes(storeId) { return readJSON(codesFile(storeId), {}); }       // code -> { advocate, createdAt }
function writeCodes(storeId, d) { writeJSON(codesFile(storeId), d); }
function readRefs(storeId) { return readJSON(refsFile(storeId), {}); }          // referee -> { code, advocate, status, ... }
function writeRefs(storeId, d) { writeJSON(refsFile(storeId), d); }

// also index advocate -> their code for quick lookup
function codeForAdvocate(storeId, advocate) {
  const codes = readCodes(storeId);
  for (const c of Object.keys(codes)) if (codes[c].advocate === advocate) return c;
  return null;
}

function genCode(advocate, existing) {
  // short, human-friendly, collision-checked
  const base = (String(advocate).replace(/\D/g, '').slice(-4) || 'REF');
  for (let i = 0; i < 20; i++) {
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
    const code = `${base}${rand}`;
    if (!existing[code]) return code;
  }
  return `REF${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

/**
 * Get (or create) an advocate\'s referral code. Idempotent: one code per advocate.
 */
function getOrCreateCode({ storeId = 'default_store', advocate } = {}) {
  if (!advocate) throw new Error('advocate (phone) is required');
  const existing = codeForAdvocate(storeId, advocate);
  if (existing) return { code: existing, advocate, existing: true };
  const codes = readCodes(storeId);
  const code = genCode(advocate, codes);
  codes[code] = { advocate, createdAt: Date.now(), rewardsGiven: 0 };
  writeCodes(storeId, codes);
  return { code, advocate, existing: false };
}

// ── Share message phrasing ─────────────────────────────────────
function templateShare(code, cfg) {
  const r = cfg.refereeRewardPoints ? ` They get ${cfg.refereeRewardPoints} points on their first order, and so do you!` : '';
  const link = cfg.shareLinkBase ? ` ${cfg.shareLinkBase}${encodeURIComponent('Use my code ' + code)}` : '';
  return `Share your code *${code}* with friends.${r}${link}`;
}

async function shareMessage({ storeId = 'default_store', advocate } = {}) {
  const { code } = getOrCreateCode({ storeId, advocate });
  const cfg = getConfig(storeId);
  if (!processPrompt) return { code, message: templateShare(code, cfg), source: 'fallback' };
  const prompt = [
    'Write ONE short, friendly WhatsApp message a customer can forward to invite friends with their referral code.',
    `Their code: ${code}.`,
    cfg.refereeRewardPoints ? `The friend gets ${cfg.refereeRewardPoints} points on first order; the referrer also gets ${cfg.advocateRewardPoints} points.` : '',
    'Warm, shareable, includes the code prominently. Return ONLY the message.'
  ].filter(Boolean).join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return { code, message: templateShare(code, cfg), source: 'fallback' };
    return { code, message: String(raw).trim().replace(/^"|"$/g, ''), source: 'ollama' };
  } catch { return { code, message: templateShare(code, cfg), source: 'fallback' }; }
}

// ── Attribution ───────────────────────────────────────────────
/**
 * Attribute a new contact to a referral code (on signup / first contact).
 * Guards: code must exist, no self-referral, referee not already attributed.
 */
function attribute({ storeId = 'default_store', referee, code } = {}) {
  if (!referee || !code) throw new Error('referee and code are required');
  const codes = readCodes(storeId);
  const entry = codes[code];
  if (!entry) return { ok: false, error: 'invalid code' };
  if (entry.advocate === referee) return { ok: false, error: 'self-referral not allowed' };
  const refs = readRefs(storeId);
  if (refs[referee]) return { ok: false, error: 'referee already attributed', existing: refs[referee] };
  refs[referee] = { referee, code, advocate: entry.advocate, status: 'pending', attributedAt: Date.now() };
  writeRefs(storeId, refs);
  return { ok: true, referral: refs[referee] };
}

/**
 * Qualify a referee (e.g. they placed their first order) -> reward both sides ONCE.
 * Guards: must be attributed + pending, advocate cap respected.
 */
function qualify({ storeId = 'default_store', referee, event = 'first_order' } = {}) {
  if (!referee) throw new Error('referee is required');
  const cfg = getConfig(storeId);
  if (cfg.qualifyEvent && event !== cfg.qualifyEvent) return { ok: false, error: `event ${event} does not qualify (expected ${cfg.qualifyEvent})` };
  const refs = readRefs(storeId);
  const r = refs[referee];
  if (!r) return { ok: false, error: 'referee not attributed to any code' };
  if (r.status === 'rewarded') return { ok: false, error: 'already rewarded' };

  const codes = readCodes(storeId);
  const codeEntry = codes[r.code];
  if (codeEntry && (codeEntry.rewardsGiven || 0) >= (cfg.maxRewardsPerAdvocate || Infinity)) {
    r.status = 'capped'; writeRefs(storeId, refs);
    return { ok: false, error: 'advocate reward cap reached', advocate: r.advocate };
  }

  // grant rewards (via loyalty if present, else record pending credits)
  const grants = { advocate: { phone: r.advocate, points: cfg.advocateRewardPoints || 0 }, referee: { phone: referee, points: cfg.refereeRewardPoints || 0 } };
  let granted = { advocate: null, referee: null };
  if (loyalty && typeof loyalty.earn === 'function') {
    if (grants.advocate.points) granted.advocate = loyalty.earn({ storeId, phone: r.advocate, points: grants.advocate.points, reason: 'referral_advocate' });
    if (grants.referee.points) granted.referee = loyalty.earn({ storeId, phone: referee, points: grants.referee.points, reason: 'referral_referee' });
  }

  r.status = 'rewarded'; r.rewardedAt = Date.now(); r.event = event; r.grants = grants;
  writeRefs(storeId, refs);
  if (codeEntry) { codeEntry.rewardsGiven = (codeEntry.rewardsGiven || 0) + 1; writeCodes(storeId, codes); }

  return { ok: true, advocate: r.advocate, referee, grants, loyaltyApplied: Boolean(loyalty && loyalty.earn) };
}

function stats({ storeId = 'default_store', advocate } = {}) {
  const refs = Object.values(readRefs(storeId));
  if (advocate) {
    const mine = refs.filter(r => r.advocate === advocate);
    return { advocate, code: codeForAdvocate(storeId, advocate), referred: mine.length, rewarded: mine.filter(r => r.status === 'rewarded').length, pending: mine.filter(r => r.status === 'pending').length };
  }
  const codes = Object.keys(readCodes(storeId)).length;
  return { advocates: codes, totalReferrals: refs.length, rewarded: refs.filter(r => r.status === 'rewarded').length, pending: refs.filter(r => r.status === 'pending').length };
}

function leaderboard({ storeId = 'default_store', limit = 20 } = {}) {
  const refs = Object.values(readRefs(storeId));
  const byAdvocate = {};
  for (const r of refs) { byAdvocate[r.advocate] = byAdvocate[r.advocate] || { advocate: r.advocate, referred: 0, rewarded: 0 }; byAdvocate[r.advocate].referred++; if (r.status === 'rewarded') byAdvocate[r.advocate].rewarded++; }
  return Object.values(byAdvocate).sort((a, b) => b.rewarded - a.rewarded || b.referred - a.referred).slice(0, limit);
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), loyaltyWired: Boolean(loyalty && loyalty.earn), currency: CURRENCY() }; }

module.exports = { getOrCreateCode, shareMessage, attribute, qualify, stats, leaderboard, getConfig, setConfig, health, _internal: { genCode, templateShare, DEFAULT_CONFIG } };
