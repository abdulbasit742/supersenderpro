// lib/sendTime/sendTimeOptimizer.js
// ────────────────────────────────────────────────────────────────────
// Smart Send-Time Optimizer. Learns WHEN each contact actually engages (opens /
// replies) and recommends the best hour to message them — so broadcasts land
// when people are awake and responsive, not at 3am. Also spreads a large
// broadcast across time slots to respect the anti-ban throttle.
//
// Deterministic core: a per-contact hour/day engagement histogram with a recency
// weight. The AI Brain Bridge (self-hosted Ollama) is optional and only used to
// phrase a human rationale ("best around 8pm, they usually reply in the evening").
//
// File-backed engagement log. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[sendTime] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.SEND_TIME_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const TZ = () => process.env.SEND_TIME_TZ || 'Asia/Karachi';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'send_time');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const engFile = (storeId) => path.join(DATA_DIR, `${storeId}_engagement.json`);

function readEng(storeId) {
  try { const f = engFile(storeId); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; }
  catch { return {}; }
}
function writeEng(storeId, data) {
  try { fs.writeFileSync(engFile(storeId), JSON.stringify(data, null, 2)); } catch (e) { console.error('[sendTime] write failed:', e.message); }
}

// local hour (0-23) and weekday (0=Sun..6=Sat) for a timestamp in the configured TZ
function localParts(ts, tz = TZ()) {
  const d = new Date(ts);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false, weekday: 'short' });
  const parts = fmt.formatToParts(d).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
  let hour = parseInt(parts.hour, 10); if (hour === 24) hour = 0;
  return { hour, weekday: wd };
}

/**
 * Record an engagement event for a contact (a reply / open / click). Call this
 * whenever a contact responds; the timestamp's local hour is what we learn from.
 */
function logEngagement({ storeId = 'default_store', phone, ts = Date.now(), weight = 1 } = {}) {
  if (!phone) throw new Error('phone is required');
  const all = readEng(storeId);
  const rec = all[phone] || { hours: new Array(24).fill(0), weekdays: new Array(7).fill(0), count: 0, lastTs: 0 };
  const { hour, weekday } = localParts(ts);
  rec.hours[hour] += weight;
  rec.weekdays[weekday] += weight;
  rec.count += 1;
  rec.lastTs = Math.max(rec.lastTs, ts);
  all[phone] = rec;
  writeEng(storeId, all);
  return rec;
}

const BUSINESS_HOURS = [9, 21]; // sensible default window when we have no data
function defaultHour() { return 11; } // late morning, broadly safe

function argmax(arr) { let bi = 0, bv = -Infinity; arr.forEach((v, i) => { if (v > bv) { bv = v; bi = i; } }); return { index: bi, value: bv }; }

/**
 * Best send hour for a contact. Returns { hour, weekday, confidence, basis }.
 * Falls back to a safe default window when there's little/no data.
 */
function bestTimeForContact({ storeId = 'default_store', phone } = {}) {
  if (!phone) throw new Error('phone is required');
  const rec = readEng(storeId)[phone];
  if (!rec || rec.count < 3) {
    return { hour: defaultHour(), weekday: null, confidence: 0.2, basis: 'default (insufficient history)', count: rec ? rec.count : 0 };
  }
  const h = argmax(rec.hours);
  const wd = argmax(rec.weekdays);
  const total = rec.hours.reduce((a, b) => a + b, 0) || 1;
  const confidence = Math.min(0.95, 0.4 + (h.value / total) * 0.6);
  // keep within a reasonable window
  let hour = h.index;
  if (hour < BUSINESS_HOURS[0] || hour > BUSINESS_HOURS[1]) hour = defaultHour();
  return { hour, weekday: wd.index, confidence, basis: 'engagement history', count: rec.count };
}

/** Next concrete datetime (ms) at the recommended hour, today or tomorrow. */
function nextSlot({ storeId = 'default_store', phone, from = Date.now() } = {}) {
  const best = bestTimeForContact({ storeId, phone });
  const now = new Date(from);
  const cur = localParts(from);
  // minutes until target hour today
  let addHours = best.hour - cur.hour;
  if (addHours <= 0) addHours += 24; // next occurrence
  const slot = new Date(from + addHours * 3600 * 1000);
  return { whenMs: slot.getTime(), whenISO: slot.toISOString(), hour: best.hour, confidence: best.confidence, basis: best.basis };
}

async function rationale(phone, best) {
  if (!processPrompt) return null;
  const prompt = [
    'In one short sentence, explain to a marketer the best time to message a contact.',
    `Recommended hour (24h, ${TZ()}): ${best.hour}. Confidence: ${Math.round(best.confidence * 100)}%. Basis: ${best.basis}.`,
    'Answer:'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    return String(raw).trim();
  } catch { return null; }
}

async function bestTime({ storeId = 'default_store', phone, withRationale = true } = {}) {
  const best = bestTimeForContact({ storeId, phone });
  const slot = nextSlot({ storeId, phone });
  const why = withRationale ? await rationale(phone, best) : null;
  return { phone, ...best, nextSlotISO: slot.whenISO, rationale: why };
}

/**
 * Schedule a broadcast: assign each recipient their best hour, then spread sends
 * across slots so no single minute exceeds `maxPerSlot` (anti-ban throttle).
 * Returns a plan: [{ phone, whenISO, hour }].
 */
function scheduleBroadcast({ storeId = 'default_store', phones = [], maxPerSlot = 20, from = Date.now() } = {}) {
  if (!Array.isArray(phones) || !phones.length) throw new Error('phones array is required');
  const slotCounts = {}; // hour-bucket -> count
  const plan = phones.map(phone => {
    let { whenMs, hour } = nextSlot({ storeId, phone, from });
    // throttle: if this hour-bucket is full, push in 1-hour steps
    let bucket = new Date(whenMs); bucket.setMinutes(0, 0, 0);
    let key = bucket.getTime();
    let guard = 0;
    while ((slotCounts[key] || 0) >= maxPerSlot && guard < 48) {
      whenMs += 3600 * 1000; bucket = new Date(whenMs); bucket.setMinutes(0, 0, 0); key = bucket.getTime(); guard++;
    }
    slotCounts[key] = (slotCounts[key] || 0) + 1;
    return { phone, whenISO: new Date(whenMs).toISOString(), hour };
  });
  plan.sort((a, b) => new Date(a.whenISO) - new Date(b.whenISO));
  return { count: plan.length, maxPerSlot, plan };
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), timezone: TZ() };
}

module.exports = {
  logEngagement, bestTimeForContact, nextSlot, bestTime, scheduleBroadcast, health,
  _internal: { localParts, argmax, defaultHour }
};
