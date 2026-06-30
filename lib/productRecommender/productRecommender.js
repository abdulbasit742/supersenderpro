'use strict';
/**
 * Feature #128 - AI Product Recommender
 * Personalized product recommendations for a contact.
 *
 * Distinct from Upsell (#40, co-occurrence "frequently bought together").
 * Here we match a CONTACT's interest/intent tags (from Smart Contact Tagging #105)
 * against the catalog (#76) using deterministic affinity scoring, then optionally
 * ask the AI Brain to phrase a short pitch. Works fully with NO model.
 *
 * House rules:
 *  - zero new npm deps (Node built-ins + global fetch only)
 *  - deterministic core, AI only enriches phrasing with graceful fallback
 *  - tenant/store-scoped; missing tenantId throws
 *  - file-backed storage under data/productRecommender/
 *  - never touches server.js; self-mountable router
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'productRecommender');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function requireTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantId is required');
  }
  return tenantId;
}

function tenantFile(tenantId, name) {
  const safe = String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_');
  ensureDir(path.join(DATA_DIR, safe));
  return path.join(DATA_DIR, safe, name);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function norm(s) {
  return String(s || '').toLowerCase().trim();
}

function tokenize(s) {
  return norm(s).split(/[^a-z0-9]+/).filter(Boolean);
}

/* ---------- catalog source ---------- */
// Prefer the catalog manager store (#76); fall back to a local catalog file.
function loadCatalog(tenantId) {
  const candidates = [
    path.join(process.cwd(), 'data', 'catalog', String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_'), 'products.json'),
    tenantFile(tenantId, 'catalog.json')
  ];
  for (const f of candidates) {
    const list = readJson(f, null);
    if (Array.isArray(list) && list.length) return list;
    if (list && Array.isArray(list.products)) return list.products;
  }
  return [];
}

function saveLocalCatalog(tenantId, products) {
  requireTenant(tenantId);
  if (!Array.isArray(products)) throw new Error('products must be an array');
  writeJson(tenantFile(tenantId, 'catalog.json'), products);
  return products.length;
}

/* ---------- contact profile ---------- */
// Pull interest/intent tags from contact tagging (#105) if present.
function loadContactTags(tenantId, contactId) {
  const candidates = [
    path.join(process.cwd(), 'data', 'contactTags', String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_'), 'contacts.json')
  ];
  for (const f of candidates) {
    const map = readJson(f, null);
    if (map && map[contactId] && Array.isArray(map[contactId].tags)) {
      return map[contactId].tags;
    }
  }
  // local override
  const local = readJson(tenantFile(tenantId, 'contacts.json'), {});
  if (local[contactId] && Array.isArray(local[contactId].tags)) return local[contactId].tags;
  return [];
}

function setContactInterests(tenantId, contactId, tags) {
  requireTenant(tenantId);
  if (!contactId) throw new Error('contactId is required');
  const file = tenantFile(tenantId, 'contacts.json');
  const map = readJson(file, {});
  map[contactId] = { tags: Array.isArray(tags) ? tags.map(norm).filter(Boolean) : [] };
  writeJson(file, map);
  return map[contactId];
}

/* ---------- deterministic affinity scoring ---------- */
function productKeywords(p) {
  const bag = [];
  bag.push(...tokenize(p.name));
  bag.push(...tokenize(p.category));
  bag.push(...tokenize(p.description));
  if (Array.isArray(p.tags)) p.tags.forEach((t) => bag.push(...tokenize(t)));
  return new Set(bag);
}

function scoreProduct(p, interestTokens, opts) {
  const kw = productKeywords(p);
  let score = 0;
  for (const tok of interestTokens) {
    if (kw.has(tok)) score += 3;
  }
  // mild boost for in-stock + popularity if present
  if (p.inStock === true || Number(p.stock) > 0) score += 1;
  if (Number(p.popularity)) score += Math.min(2, Number(p.popularity) / 100);
  // exclude already-purchased if provided
  if (opts && Array.isArray(opts.exclude) && opts.exclude.includes(p.id)) score = -1;
  return score;
}

function recommend(tenantId, contactId, opts) {
  requireTenant(tenantId);
  opts = opts || {};
  const limit = Math.max(1, Math.min(20, Number(opts.limit) || 3));
  const catalog = loadCatalog(tenantId);
  if (!catalog.length) {
    return { contactId, recommendations: [], reason: 'empty_catalog' };
  }
  let interests = Array.isArray(opts.interests) && opts.interests.length
    ? opts.interests
    : loadContactTags(tenantId, contactId);
  const interestTokens = new Set();
  interests.forEach((t) => tokenize(t).forEach((tok) => interestTokens.add(tok)));

  let scored = catalog.map((p) => ({ product: p, score: scoreProduct(p, interestTokens, opts) }));

  // if no interest signal, fall back to popularity / in-stock ranking (still deterministic)
  const hasSignal = interestTokens.size > 0 && scored.some((s) => s.score > 1);
  if (!hasSignal) {
    scored = catalog.map((p) => ({
      product: p,
      score: (Number(p.popularity) || 0) + ((p.inStock || Number(p.stock) > 0) ? 1 : 0)
    }));
  }

  scored = scored
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score || norm(a.product.name).localeCompare(norm(b.product.name)))
    .slice(0, limit);

  return {
    contactId,
    basedOn: hasSignal ? 'interest_affinity' : 'popularity_fallback',
    interests: Array.from(interestTokens),
    recommendations: scored.map((s) => ({
      id: s.product.id,
      name: s.product.name,
      price: s.product.price,
      category: s.product.category,
      score: Number(s.score.toFixed(2))
    }))
  };
}

/* ---------- optional AI-phrased pitch (graceful fallback) ---------- */
async function pitch(tenantId, contactId, opts) {
  const rec = recommend(tenantId, contactId, opts);
  if (!rec.recommendations.length) {
    return { ...rec, message: 'Filhaal koi suitable product nahi mila.' };
  }
  const lines = rec.recommendations
    .map((r, i) => `${i + 1}. ${r.name}${r.price != null ? ` - ${r.price}` : ''}`)
    .join('\n');
  const deterministic = `Aap ke liye recommendations:\n${lines}`;

  // try AI Brain to phrase a warmer pitch; never fail if model is down
  try {
    const aiBrain = require('../../ai/aiBrain');
    if (aiBrain && typeof aiBrain.processPrompt === 'function') {
      const prompt = `Customer ke liye in products ka short, friendly WhatsApp pitch likho (Roman Urdu, max 3 lines, no emojis spam):\n${lines}`;
      const out = await aiBrain.processPrompt(prompt, { tenantId, feature: 'productRecommender' });
      const text = (out && (out.text || out.output || out.message)) || '';
      if (text && String(text).trim()) {
        return { ...rec, message: String(text).trim(), source: 'ai' };
      }
    }
  } catch (_) {
    // swallow - fall back to deterministic
  }
  return { ...rec, message: deterministic, source: 'deterministic' };
}

module.exports = {
  recommend,
  pitch,
  setContactInterests,
  loadContactTags,
  saveLocalCatalog,
  loadCatalog,
  _internal: { scoreProduct, productKeywords, requireTenant }
};
