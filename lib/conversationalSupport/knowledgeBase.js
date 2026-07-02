'use strict';
/**
 * lib/conversationalSupport/knowledgeBase.js - tenant-scoped knowledge the agent answers from:
 *   - faqs:     [{ id, q, a, tags[] }]
 *   - products: [{ id, name, sku, price, currency, desc, inStock }]
 *   - settings: { businessName, hours, currency, fallbackMessage, greeting }
 *
 * Also exposes:
 *   - context(tid): a compact text block fed to the LLM as grounding
 *   - bestFaq(tid, text): deterministic FAQ match (used as fallback when no model is reachable)
 *   - findProduct(tid, text): loose product lookup for the order flow
 */
const { paths } = require('./config');
const store = require('./store');
const { id, nowISO, norm, overlapScore } = require('./util');

const DEFAULTS = {
  faqs: [
    { id: 'faq_hours', q: 'What are your timings / working hours?', a: 'We are available 24/7 on WhatsApp. Orders placed any time are processed next business day.', tags: ['hours', 'timing', 'open'] },
    { id: 'faq_delivery', q: 'How long does delivery take?', a: 'Delivery usually takes 2-4 working days across major cities. You get a tracking link once shipped.', tags: ['delivery', 'shipping', 'tracking'] },
    { id: 'faq_payment', q: 'What payment methods do you accept?', a: 'We accept Cash on Delivery (COD), bank transfer, and major cards.', tags: ['payment', 'cod', 'card'] },
  ],
  products: [],
  settings: {
    businessName: 'SuperSender Store',
    hours: '24/7',
    currency: 'PKR',
    greeting: 'Assalam o Alaikum! 👋 Main aap ki kaise madad kar sakta hoon?',
    fallbackMessage: 'Maazrat, main is ka theek jawab nahi de paya. Main aap ko hamari team se connect kar deta hoon.',
  },
};

const read = (tid) => store.readJSON(paths.kb(tid), JSON.parse(JSON.stringify(DEFAULTS)));
const write = (tid, d) => store.writeJSON(paths.kb(tid), d);

function get(tid) { return read(tid); }
function settings(tid) { return read(tid).settings || {}; }

function updateSettings(tid, patch) {
  const kb = read(tid);
  kb.settings = Object.assign({}, kb.settings, patch || {});
  write(tid, kb);
  return kb.settings;
}

/* ---- FAQs ---- */
function listFaqs(tid) { return read(tid).faqs || []; }
function addFaq(tid, faq) {
  if (!faq || !faq.q || !faq.a) throw new Error('faq requires q and a');
  const kb = read(tid);
  const item = { id: id('faq'), q: String(faq.q), a: String(faq.a), tags: Array.isArray(faq.tags) ? faq.tags : [], createdAt: nowISO() };
  kb.faqs = kb.faqs || []; kb.faqs.push(item); write(tid, kb);
  return item;
}
function removeFaq(tid, faqId) {
  const kb = read(tid); const before = (kb.faqs || []).length;
  kb.faqs = (kb.faqs || []).filter((f) => f.id !== faqId); write(tid, kb);
  return (kb.faqs || []).length < before;
}

/* ---- Products ---- */
function listProducts(tid) { return read(tid).products || []; }
function addProduct(tid, p) {
  if (!p || !p.name) throw new Error('product requires a name');
  const kb = read(tid);
  const item = {
    id: id('prod'), name: String(p.name), sku: p.sku || '', price: Number(p.price) || 0,
    currency: p.currency || (kb.settings && kb.settings.currency) || 'PKR',
    desc: p.desc || '', inStock: p.inStock === undefined ? true : !!p.inStock, createdAt: nowISO(),
  };
  kb.products = kb.products || []; kb.products.push(item); write(tid, kb);
  return item;
}
function removeProduct(tid, prodId) {
  const kb = read(tid); const before = (kb.products || []).length;
  kb.products = (kb.products || []).filter((p) => p.id !== prodId); write(tid, kb);
  return (kb.products || []).length < before;
}

/** Loose product lookup by name/sku presence in the message text. */
function findProduct(tid, text) {
  const t = norm(text);
  if (!t) return null;
  const products = listProducts(tid);
  let best = null; let bestScore = 0;
  for (const p of products) {
    if (p.sku && t.includes(norm(p.sku))) return p;
    const score = Math.max(t.includes(norm(p.name)) ? 1 : 0, overlapScore(text, p.name + ' ' + (p.desc || '')));
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return bestScore >= 0.34 ? best : null;
}

/** Deterministic FAQ match -> { faq, score } or null. Used as the no-model fallback. */
function bestFaq(tid, text) {
  const faqs = listFaqs(tid);
  let best = null; let bestScore = 0;
  for (const f of faqs) {
    const hay = [f.q, f.a, (f.tags || []).join(' ')].join(' ');
    const score = overlapScore(text, hay);
    if (score > bestScore) { bestScore = score; best = f; }
  }
  return best && bestScore >= 0.34 ? { faq: best, score: bestScore } : null;
}

/** Compact grounding block for the LLM. Kept short so it fits any context window. */
function context(tid) {
  const kb = read(tid);
  const s = kb.settings || {};
  const lines = [];
  lines.push('BUSINESS: ' + (s.businessName || 'Store') + ' | Hours: ' + (s.hours || '24/7') + ' | Currency: ' + (s.currency || 'PKR'));
  if ((kb.faqs || []).length) {
    lines.push('FAQS:');
    kb.faqs.slice(0, 30).forEach((f) => lines.push('- Q: ' + f.q + ' A: ' + f.a));
  }
  if ((kb.products || []).length) {
    lines.push('PRODUCTS:');
    kb.products.slice(0, 40).forEach((p) => lines.push('- ' + p.name + (p.sku ? ' [' + p.sku + ']' : '') + ' - ' + p.price + ' ' + p.currency + (p.inStock ? '' : ' (OUT OF STOCK)')));
  }
  return lines.join('\n');
}

module.exports = {
  get, settings, updateSettings,
  listFaqs, addFaq, removeFaq,
  listProducts, addProduct, removeProduct, findProduct,
  bestFaq, context,
};
