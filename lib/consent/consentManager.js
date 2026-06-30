// lib/consent/consentManager.js
// ────────────────────────────────────────────────────────────────────
// Consent & Compliance Manager. Sending marketing to people who didn\'t opt in
// (or who said STOP) is how numbers get banned AND how you get into legal
// trouble. This is the source of truth for WHO you\'re allowed to message: a
// per-contact consent ledger (opt-in / opt-out with timestamp + source proof),
// automatic opt-out keyword detection (STOP / UNSUBSCRIBE / \"band karo\"), a
// quiet-hours window, and ONE gate — canSendMarketing() — every broadcast must
// pass before sending.
//
// The gate + ledger are fully deterministic + auditable; the AI Brain Bridge
// (self-hosted Ollama) only phrases the opt-out confirmation. Append-only audit
// log per contact. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[consent] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.CONSENT_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'consent');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const ledgerFile = (storeId) => path.join(DATA_DIR, `${storeId}_ledger.json`);
const configFile = (storeId) => path.join(DATA_DIR, `${storeId}_config.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[consent] write failed:', e.message); } }
function readLedger(storeId) { return readJSON(ledgerFile(storeId), {}); }
function writeLedger(storeId, d) { writeJSON(ledgerFile(storeId), d); }

const DEFAULT_CONFIG = {
  timezone: 'Asia/Karachi',
  quietStart: '21:00',         // no marketing after this local time
  quietEnd: '09:00',          // ... until this local time
  defaultOptedIn: false,      // strict by default: must opt in to receive marketing
  optOutKeywords: ['stop', 'unsubscribe', 'unsub', 'opt out', 'optout', 'remove me', 'band karo', 'band kardo', 'mat bhejo', 'rok do', 'block'],
  optInKeywords: ['start', 'subscribe', 'yes', 'haan', 'theek hai', 'chalu karo']
};
function getConfig(storeId) { return readJSON(configFile(storeId), { ...DEFAULT_CONFIG }); }
function setConfig(storeId, updates = {}) { const m = { ...getConfig(storeId), ...updates }; writeJSON(configFile(storeId), m); return m; }

function rec(ledger, phone) { return ledger[phone] || { phone, status: null, audit: [] }; }

function log(r, action, source) { r.audit.push({ action, source: source || null, ts: Date.now() }); if (r.audit.length > 200) r.audit = r.audit.slice(-200); }

// ── Opt-in / opt-out ──────────────────────────────────────────
function optIn({ storeId = 'default_store', phone, source = 'manual' } = {}) {
  if (!phone) throw new Error('phone is required');
  const l = readLedger(storeId); const r = rec(l, phone);
  r.status = 'opted_in'; r.optedInAt = Date.now(); r.optedOutAt = r.optedOutAt || null;
  log(r, 'opt_in', source);
  l[phone] = r; writeLedger(storeId, l);
  return { phone, status: r.status };
}
function optOut({ storeId = 'default_store', phone, source = 'manual' } = {}) {
  if (!phone) throw new Error('phone is required');
  const l = readLedger(storeId); const r = rec(l, phone);
  r.status = 'opted_out'; r.optedOutAt = Date.now();
  log(r, 'opt_out', source);
  l[phone] = r; writeLedger(storeId, l);
  return { phone, status: r.status };
}

// ── Inbound keyword detection ────────────────────────────────────
function classifyMessage(storeId, text) {
  const cfg = getConfig(storeId); const t = String(text || '').toLowerCase().trim();
  if (cfg.optOutKeywords.some(k => t === k || t.includes(k))) return 'opt_out';
  if (cfg.optInKeywords.some(k => t === k)) return 'opt_in';
  return 'none';
}

/**
 * Process an inbound message for consent keywords. If it\'s an opt-out/opt-in,
 * updates the ledger and returns a confirmation message to send back.
 */
async function processInbound({ storeId = 'default_store', phone, text } = {}) {
  if (!phone) throw new Error('phone is required');
  const action = classifyMessage(storeId, text);
  if (action === 'opt_out') { optOut({ storeId, phone, source: 'keyword' }); return { action, confirm: await phraseOptOut(), status: 'opted_out' }; }
  if (action === 'opt_in') { optIn({ storeId, phone, source: 'keyword' }); return { action, confirm: 'You\'re subscribed again \u2705 You\'ll receive our updates. Reply STOP anytime to opt out.', status: 'opted_in' }; }
  return { action: 'none' };
}

async function phraseOptOut() {
  const base = 'You\'ve been unsubscribed and won\'t receive promotional messages. Reply START anytime to opt back in. \ud83d\ude4f';
  if (!processPrompt) return base;
  try {
    const raw = await processPrompt(['Write ONE short, polite WhatsApp opt-out confirmation. Tell them they won\'t get promos and can reply START to rejoin. Return ONLY the message.'].join('\n'), { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return base;
    return String(raw).trim().replace(/^"|"$/g, '');
  } catch { return base; }
}

// ── Quiet hours ────────────────────────────────────────────
function localHHMM(tz, date = new Date()) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = f.formatToParts(date).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  let h = parseInt(p.hour, 10); if (h === 24) h = 0;
  return `${String(h).padStart(2, '0')}:${p.minute}`;
}
function inQuietHours(cfg, date = new Date()) {
  const now = localHHMM(cfg.timezone, date);
  const s = cfg.quietStart, e = cfg.quietEnd;
  // window may wrap midnight (e.g. 21:00 -> 09:00)
  if (s <= e) return now >= s && now < e;
  return now >= s || now < e;
}

// ── The gate ─────────────────────────────────────────────────
/**
 * The ONE check every marketing send must pass.
 * @returns {{ allowed:boolean, reason:string, status:string }}
 */
function canSendMarketing({ storeId = 'default_store', phone, ignoreQuietHours = false } = {}) {
  if (!phone) throw new Error('phone is required');
  const cfg = getConfig(storeId);
  const r = readLedger(storeId)[phone];
  const status = r ? r.status : (cfg.defaultOptedIn ? 'opted_in' : 'unknown');
  if (status === 'opted_out') return { allowed: false, reason: 'contact opted out', status };
  if (!cfg.defaultOptedIn && status !== 'opted_in') return { allowed: false, reason: 'no opt-in on record', status };
  if (!ignoreQuietHours && inQuietHours(cfg)) return { allowed: false, reason: 'within quiet hours', status };
  return { allowed: true, reason: 'ok', status: status === 'unknown' ? 'opted_in_default' : status };
}

/** Filter a list of phones to only those allowed to receive marketing now. */
function filterSendable({ storeId = 'default_store', phones = [], ignoreQuietHours = false } = {}) {
  const allowed = [], blocked = [];
  for (const phone of phones) { const c = canSendMarketing({ storeId, phone, ignoreQuietHours }); (c.allowed ? allowed : blocked).push({ phone, reason: c.reason }); }
  return { allowed: allowed.map(a => a.phone), blocked, allowedCount: allowed.length, blockedCount: blocked.length };
}

function status({ storeId = 'default_store', phone } = {}) {
  const r = readLedger(storeId)[phone];
  const cfg = getConfig(storeId);
  return { phone, status: r ? r.status : (cfg.defaultOptedIn ? 'opted_in_default' : 'unknown'), optedInAt: r ? r.optedInAt : null, optedOutAt: r ? r.optedOutAt : null, auditCount: r ? r.audit.length : 0 };
}
/** Full audit trail for a contact (compliance proof). */
function exportAudit({ storeId = 'default_store', phone } = {}) {
  const r = readLedger(storeId)[phone];
  return r ? { phone, status: r.status, audit: r.audit } : { phone, status: 'unknown', audit: [] };
}
function stats({ storeId = 'default_store' } = {}) {
  const l = Object.values(readLedger(storeId));
  return { contacts: l.length, optedIn: l.filter(r => r.status === 'opted_in').length, optedOut: l.filter(r => r.status === 'opted_out').length };
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL() }; }

module.exports = { optIn, optOut, processInbound, classifyMessage, canSendMarketing, filterSendable, status, exportAudit, stats, getConfig, setConfig, health, _internal: { inQuietHours, localHHMM, DEFAULT_CONFIG } };
