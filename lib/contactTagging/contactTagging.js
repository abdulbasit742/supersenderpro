'use strict';
/**
 * AI Smart Contact Tagging / Auto-Segmentation (#105)
 * -------------------------------------------------
 * Deterministic core: derives tags for a contact from their message history
 * and signals (recency, frequency, monetary, intent keywords). Optional
 * Ollama enrichment adds nuanced interest tags; ALWAYS falls back gracefully.
 *
 * Design rules honoured:
 *  - zero new npm deps (node built-ins + global fetch only)
 *  - deterministic core works with NO model running
 *  - tenant-scoped, file-backed under data/contactTags/<tenantId>.json
 *  - server.js never touched; mount via routes/contactTaggingRoutes.js
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'contactTags');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function tenantFile(tenantId) {
  if (!tenantId) throw new Error('tenantId required');
  return path.join(DATA_DIR, String(tenantId).replace(/[^a-z0-9_-]/gi, '_') + '.json');
}

function loadStore(tenantId) {
  try {
    const raw = fs.readFileSync(tenantFile(tenantId), 'utf8');
    return JSON.parse(raw);
  } catch (_) { return { contacts: {} }; }
}
function saveStore(tenantId, store) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(tenantFile(tenantId), JSON.stringify(store, null, 2));
}

// ---- deterministic signal extraction ------------------------------------
const INTENT_RULES = [
  { tag: 'intent:buy',      re: /\b(price|kitne|kitna|order|buy|khareed|chahiye|available|stock|book)\b/i },
  { tag: 'intent:support',  re: /\b(problem|issue|complaint|not working|kharab|refund|return|broken|help)\b/i },
  { tag: 'intent:delivery', re: /\b(deliver|shipping|track|kahan|courier|tcs|leopard|address|parcel)\b/i },
  { tag: 'intent:payment',  re: /\b(payment|paid|easypaisa|jazzcash|bank|account|transfer|screenshot)\b/i },
  { tag: 'intent:greeting', re: /\b(salam|hello|hi|assalam|aoa|good morning)\b/i }
];

const INTEREST_RULES = [
  { tag: 'interest:electronics', re: /\b(phone|mobile|laptop|charger|earbuds|watch|gadget)\b/i },
  { tag: 'interest:fashion',     re: /\b(dress|kurta|shirt|shoes|lawn|suit|abaya|jewel)\b/i },
  { tag: 'interest:beauty',      re: /\b(cream|makeup|lipstick|skincare|serum|perfume)\b/i },
  { tag: 'interest:home',        re: /\b(furniture|kitchen|bedsheet|decor|appliance)\b/i }
];

function daysSince(ts) {
  if (!ts) return Infinity;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
}

/**
 * Score a contact from a history array of { text, ts, amount } messages.
 * Returns { tags, lifecycle, signals } purely deterministically.
 */
function scoreContact(history, opts = {}) {
  history = Array.isArray(history) ? history : [];
  const tags = new Set();
  let totalSpend = 0;
  let lastTs = 0;
  let inbound = 0;

  for (const m of history) {
    const text = (m && m.text) || '';
    if (m && m.ts && new Date(m.ts).getTime() > lastTs) lastTs = new Date(m.ts).getTime();
    if (m && typeof m.amount === 'number') totalSpend += m.amount;
    if (!m || m.direction !== 'out') inbound++;
    for (const r of INTENT_RULES) if (r.re.test(text)) tags.add(r.tag);
    for (const r of INTEREST_RULES) if (r.re.test(text)) tags.add(r.tag);
  }

  const recency = daysSince(lastTs || null);
  const frequency = inbound;
  const monetary = totalSpend;

  // lifecycle stage (RFM-lite, deterministic thresholds)
  let lifecycle = 'new';
  if (frequency === 0) lifecycle = 'cold';
  else if (recency > 60) lifecycle = 'at-risk';
  else if (recency > 30) lifecycle = 'dormant';
  else if (monetary >= (opts.vipSpend || 50000)) lifecycle = 'vip';
  else if (frequency >= 3) lifecycle = 'active';
  else lifecycle = 'new';

  tags.add('stage:' + lifecycle);
  if (monetary > 0) tags.add('buyer');
  if (monetary >= (opts.vipSpend || 50000)) tags.add('vip');

  return {
    tags: Array.from(tags).sort(),
    lifecycle,
    signals: { recencyDays: recency === Infinity ? null : recency, frequency, monetary }
  };
}

// ---- optional Ollama enrichment -----------------------------------------
async function enrichWithAI(history, baseTags) {
  let processPrompt;
  try { ({ processPrompt } = require('../../ai/aiBrain')); } catch (_) { return baseTags; }
  if (typeof processPrompt !== 'function') return baseTags;
  try {
    const sample = (history || []).slice(-12).map(m => (m && m.text) || '').filter(Boolean).join('\n');
    if (!sample) return baseTags;
    const prompt = 'From these WhatsApp messages, output up to 4 short lowercase interest/persona tags ' +
      'as a comma list (e.g. interest:gifting, persona:reseller). No sentences.\n\n' + sample;
    const out = await processPrompt(prompt, { maxTokens: 60 });
    const extra = String(out || '')
      .split(/[,\n]/).map(s => s.trim().toLowerCase())
      .filter(s => /^[a-z]+:[a-z0-9 _-]{2,}$/.test(s)).slice(0, 4);
    return Array.from(new Set([...baseTags, ...extra])).sort();
  } catch (_) { return baseTags; }
}

/**
 * Tag a single contact and persist. AI enrichment is opt-in via opts.ai.
 */
async function tagContact(tenantId, contactId, history, opts = {}) {
  if (!tenantId) throw new Error('tenantId required');
  if (!contactId) throw new Error('contactId required');
  const base = scoreContact(history, opts);
  let tags = base.tags;
  if (opts.ai) tags = await enrichWithAI(history, base.tags);
  const record = {
    contactId: String(contactId),
    tags,
    lifecycle: base.lifecycle,
    signals: base.signals,
    updatedAt: new Date().toISOString()
  };
  const store = loadStore(tenantId);
  store.contacts[String(contactId)] = record;
  saveStore(tenantId, store);
  return record;
}

function getContact(tenantId, contactId) {
  const store = loadStore(tenantId);
  return store.contacts[String(contactId)] || null;
}

/** Return all contacts carrying a given tag (deterministic segment). */
function segment(tenantId, tag) {
  const store = loadStore(tenantId);
  return Object.values(store.contacts).filter(c => (c.tags || []).includes(tag));
}

/** Tag-count summary across the tenant for dashboards. */
function summary(tenantId) {
  const store = loadStore(tenantId);
  const counts = {};
  for (const c of Object.values(store.contacts)) {
    for (const t of (c.tags || [])) counts[t] = (counts[t] || 0) + 1;
  }
  return { total: Object.keys(store.contacts).length, tagCounts: counts };
}

module.exports = { scoreContact, tagContact, getContact, segment, summary, enrichWithAI };
