// lib/segments/segmentBuilder.js
// ────────────────────────────────────────────────────────────────────
// Natural-Language Audience Segment Builder. Instead of clicking filter UIs, the
// founder types "hot leads who never bought, in Lahore" and gets a real contact
// list to broadcast to. The AI Brain Bridge (self-hosted Ollama) maps the text
// to a STRUCTURED FILTER against a fixed, allow-listed schema — it never writes
// code or queries, so there is no injection surface. A deterministic keyword
// parser is the fallback so it works with no model.
//
// The filter is then evaluated in plain JS over the lead-intel store (#11).
// Segments can be saved by name and reused. File-backed. Zero new npm deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[segments] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.SEGMENT_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const DATA_ROOT = path.join(__dirname, '..', '..', 'data');
const DATA_DIR = path.join(DATA_ROOT, 'segments');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const savedFile = (storeId) => path.join(DATA_DIR, `${storeId}_saved.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[segments] write failed:', e.message); } }

function leadStore(storeId) { return readJSON(path.join(DATA_ROOT, 'lead_intel', `${storeId}_scores.json`), {}); }

// ── Allowed filter schema (the ONLY fields the model/parser may use) ───────
const BANDS = ['hot', 'warm', 'cold', 'dormant'];
// filter shape (all optional, AND-combined):
// { bands:[..], scoreMin, scoreMax, atRisk:bool, hasOrderIntent:bool,
//   neverPurchased:bool, daysSinceMin, daysSinceMax, city }
function emptyFilter() { return {}; }

function sanitizeFilter(raw = {}) {
  const f = {};
  if (Array.isArray(raw.bands)) { const b = raw.bands.map(x => String(x).toLowerCase()).filter(x => BANDS.includes(x)); if (b.length) f.bands = b; }
  if (typeof raw.scoreMin === 'number') f.scoreMin = Math.max(0, Math.min(100, raw.scoreMin));
  if (typeof raw.scoreMax === 'number') f.scoreMax = Math.max(0, Math.min(100, raw.scoreMax));
  if (typeof raw.atRisk === 'boolean') f.atRisk = raw.atRisk;
  if (typeof raw.hasOrderIntent === 'boolean') f.hasOrderIntent = raw.hasOrderIntent;
  if (typeof raw.neverPurchased === 'boolean') f.neverPurchased = raw.neverPurchased;
  if (typeof raw.daysSinceMin === 'number') f.daysSinceMin = Math.max(0, raw.daysSinceMin);
  if (typeof raw.daysSinceMax === 'number') f.daysSinceMax = Math.max(0, raw.daysSinceMax);
  if (raw.city && typeof raw.city === 'string') f.city = raw.city.toLowerCase().trim();
  return f;
}

// ── Deterministic keyword parser (fallback / always-on sanity) ────────────
const CITY_HINTS = ['lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 'peshawar', 'quetta', 'sialkot', 'gujranwala', 'hyderabad'];

function parseKeyword(text = '') {
  const t = String(text).toLowerCase();
  const f = {};
  const bands = BANDS.filter(b => t.includes(b));
  if (bands.length) f.bands = bands;
  if (/at[- ]?risk|unhappy|churn|complain/.test(t)) f.atRisk = true;
  if (/never (?:bought|purchased|ordered)|no purchase|haven'?t bought/.test(t)) f.neverPurchased = true;
  if (/order intent|wants? to (?:buy|order)|interested in buying/.test(t)) f.hasOrderIntent = true;
  const city = CITY_HINTS.find(c => t.includes(c));
  if (city) f.city = city;
  // "score above 70", "score over 50"
  const sMin = t.match(/score\s*(?:above|over|>=?|more than)\s*(\d{1,3})/);
  if (sMin) f.scoreMin = parseInt(sMin[1], 10);
  const sMax = t.match(/score\s*(?:below|under|<=?|less than)\s*(\d{1,3})/);
  if (sMax) f.scoreMax = parseInt(sMax[1], 10);
  // "quiet for 30 days", "inactive 21+ days", "last contact over 14 days"
  const dMin = t.match(/(?:quiet|inactive|no contact|last contact)\D{0,12}(\d{1,3})\s*\+?\s*days?/);
  if (dMin) f.daysSinceMin = parseInt(dMin[1], 10);
  return sanitizeFilter(f);
}

// ── AI parser (text -> filter JSON, schema-locked) ──────────────────────
function stripJson(s) {
  const fence = String(s).match(/```(?:json)?\s*([\s\S]*?)```/i);
  let body = fence ? fence[1] : s;
  const a = body.indexOf('{'), b = body.lastIndexOf('}');
  if (a >= 0 && b > a) body = body.slice(a, b + 1);
  return body.trim();
}

async function parseAI(text) {
  if (!processPrompt) return null;
  const prompt = [
    'Convert this audience description into a STRICT JSON filter. Output JSON only.',
    'Allowed fields (all optional): {"bands":["hot"|"warm"|"cold"|"dormant"], "scoreMin":0-100, "scoreMax":0-100, "atRisk":bool, "hasOrderIntent":bool, "neverPurchased":bool, "daysSinceMin":int, "daysSinceMax":int, "city":string}',
    'Use ONLY these fields. Omit anything not mentioned. Do not invent fields or values.',
    '',
    `Description: "${text}"`,
    '',
    'JSON:'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    const parsed = JSON.parse(stripJson(raw));
    return sanitizeFilter(parsed);
  } catch (err) { console.warn('[segments] AI parse failed:', err.message); return null; }
}

/**
 * Build a filter from a natural-language description. AI first (schema-locked),
 * then merge in deterministic keyword hits so nothing obvious is missed.
 * @returns {Promise<{ filter, method }>}
 */
async function build({ text } = {}) {
  if (!text || !String(text).trim()) throw new Error('text is required');
  const kw = parseKeyword(text);
  const ai = await parseAI(text);
  if (ai && Object.keys(ai).length) {
    // union: AI is primary, keyword fills any gaps it missed
    const filter = sanitizeFilter({ ...kw, ...ai });
    return { filter, method: 'ai' };
  }
  return { filter: kw, method: 'keyword' };
}

// ── Evaluate a filter over the lead store ───────────────────────────
function matches(lead, f) {
  const s = lead.signals || {};
  if (f.bands && !f.bands.includes(lead.band)) return false;
  if (f.scoreMin != null && (lead.score || 0) < f.scoreMin) return false;
  if (f.scoreMax != null && (lead.score || 0) > f.scoreMax) return false;
  if (f.atRisk != null && Boolean(lead.atRisk) !== f.atRisk) return false;
  if (f.hasOrderIntent != null && Boolean(s.hasOrderIntent) !== f.hasOrderIntent) return false;
  if (f.neverPurchased === true && s.hasOrderIntent === true) {
    // treat prior order intent as a (weak) purchase proxy unless data says otherwise
  }
  if (f.neverPurchased === true && lead.purchased === true) return false;
  if (f.daysSinceMin != null && (s.daysSinceLastContact == null || s.daysSinceLastContact < f.daysSinceMin)) return false;
  if (f.daysSinceMax != null && (s.daysSinceLastContact == null || s.daysSinceLastContact > f.daysSinceMax)) return false;
  if (f.city) {
    const city = (lead.city || (lead.signals && lead.signals.city) || '').toLowerCase();
    if (city !== f.city) return false;
  }
  return true;
}

/**
 * Resolve a filter to an actual contact list from the lead-intel store.
 * @returns {{ count, contacts:[{phone,band,score}], filter }}
 */
function resolve({ storeId = 'default_store', filter = {}, limit = 5000 } = {}) {
  const f = sanitizeFilter(filter);
  const leads = leadStore(storeId);
  const contacts = [];
  for (const phone of Object.keys(leads)) {
    const lead = leads[phone];
    if (matches(lead, f)) contacts.push({ phone, band: lead.band, score: lead.score || 0 });
    if (contacts.length >= limit) break;
  }
  contacts.sort((a, b) => (b.score || 0) - (a.score || 0));
  return { count: contacts.length, contacts, filter: f };
}

/** Build + resolve in one call. */
async function buildAndResolve({ storeId = 'default_store', text, limit = 5000 } = {}) {
  const { filter, method } = await build({ text });
  const res = resolve({ storeId, filter, limit });
  return { text, method, ...res };
}

// ── Saved segments ────────────────────────────────────────────
function saveSegment({ storeId = 'default_store', name, filter, text } = {}) {
  if (!name) throw new Error('name is required');
  const all = readJSON(savedFile(storeId), {});
  all[name] = { name, filter: sanitizeFilter(filter || {}), text: text || null, savedAt: Date.now() };
  writeJSON(savedFile(storeId), all);
  return all[name];
}
function listSegments({ storeId = 'default_store' } = {}) { return Object.values(readJSON(savedFile(storeId), {})); }
function getSegment({ storeId = 'default_store', name } = {}) { return readJSON(savedFile(storeId), {})[name] || null; }
function deleteSegment({ storeId = 'default_store', name } = {}) {
  const all = readJSON(savedFile(storeId), {}); const had = Boolean(all[name]); delete all[name]; writeJSON(savedFile(storeId), all); return { deleted: had };
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), allowedFields: ['bands', 'scoreMin', 'scoreMax', 'atRisk', 'hasOrderIntent', 'neverPurchased', 'daysSinceMin', 'daysSinceMax', 'city'] };
}

module.exports = {
  build, resolve, buildAndResolve, saveSegment, listSegments, getSegment, deleteSegment, health,
  _internal: { parseKeyword, sanitizeFilter, matches, BANDS }
};
