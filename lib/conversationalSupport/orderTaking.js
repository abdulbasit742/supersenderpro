'use strict';
/**
 * lib/conversationalSupport/orderTaking.js - a small conversational order-capture state machine.
 * Collects items -> address -> confirmation, persists the order tenant-scoped, and (best-effort)
 * hands a confirmed order to lib/ecommerceHub orderPipeline if present. DRY-RUN safe: never charges.
 */
const { paths } = require('./config');
const store = require('./store');

let pipeline = null;
for (const p of ['../ecommerceHub/orderPipeline', '../ecommerceHub', '../salesPipeline']) {
  try { const m = require(p); if (m) { pipeline = m; break; } } catch {}
}

const QTY_RE = /(\d+)\s*(x|pcs|piece|pieces|adad|qty)?/i;

function listOrders(tid) { return store.readJSON(paths.orders(tid), { orders: [] }).orders; }
function persist(tid, orders) { return store.writeJSON(paths.orders(tid), { orders }).orders; }

function newDraft() { return { items: [], name: null, address: null, stage: 'item', createdAt: new Date().toISOString() }; }

/**
 * Advance the order draft by one user message. Returns { draft, reply, done }.
 * Caller persists `draft` onto the session.
 */
function step(draft, text, contact) {
  draft = draft || newDraft();
  const t = String(text || '').trim();
  const low = t.toLowerCase();

  if (draft.stage === 'item') {
    if (!t) return { draft, reply: 'Aap kya order karna chahenge? Item ka naam likh dein (qty ke sath, e.g. "2 x Black T-Shirt").', done: false };
    const m = t.match(QTY_RE);
    const qty = m && m[1] ? Math.max(1, parseInt(m[1], 10)) : 1;
    const name = t.replace(QTY_RE, '').replace(/^\s*[-:]\s*/, '').trim() || t;
    draft.items.push({ name, qty });
    draft.stage = 'more';
    return { draft, reply: 'Add kiya: ' + qty + ' x ' + name + '. Aur kuch chahiye? (haan = agla item likhein / nahi = aage barhein)', done: false };
  }
  if (draft.stage === 'more') {
    if (/(nahi|nhi|no|nope|done|bas|that'?s all|aage|next)/i.test(low)) { draft.stage = 'address'; return { draft, reply: 'Theek hai. Apna naam aur delivery address bata dein.', done: false }; }
    if (/(haan|han|haa|yes|aur|more|add)/i.test(low)) { draft.stage = 'item'; return { draft, reply: 'Agla item likh dein (qty ke sath, e.g. "2 x Black T-Shirt").', done: false }; }
    draft.stage = 'item';
    return step(draft, t, contact);
  }
  if (draft.stage === 'address') {
    if (!draft.name) draft.name = (contact && contact.name) || t.split(/[,\n]/)[0].slice(0, 60);
    draft.address = t;
    draft.stage = 'confirm';
    const summary = draft.items.map((i) => i.qty + ' x ' + i.name).join(', ');
    return { draft, reply: 'Confirm karein: ' + summary + ' | ' + draft.name + ' | ' + draft.address + '\nSahi hai? (haan / nahi)', done: false };
  }
  if (draft.stage === 'confirm') {
    if (/(haan|han|haa|yes|confirm|sahi|theek|ok)/i.test(low)) { draft.stage = 'placed'; return { draft, reply: null, done: true }; }
    if (/(nahi|nhi|no|cancel|galat)/i.test(low)) { return { draft: newDraft(), reply: 'Koi baat nahi, order cancel kar diya. Dobara shuru karein - kya order karna hai?', done: false }; }
    return { draft, reply: 'Bas "haan" likhein confirm ke liye ya "nahi" cancel ke liye.', done: false };
  }
  return { draft, reply: 'Order process ho raha hai.', done: false };
}

/** Persist a confirmed order + best-effort pipeline ingest (dry-run). */
function place(tid, draft, contact) {
  const orders = listOrders(tid);
  const order = {
    id: 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    tenantId: tid,
    contact: { phone: contact && contact.phone, name: draft.name || (contact && contact.name) || null },
    items: draft.items, address: draft.address,
    status: 'pending', source: 'whatsapp_ai_agent', dryRun: true, createdAt: new Date().toISOString(),
  };
  orders.push(order); persist(tid, orders);
  let pipelineResult = null;
  try {
    if (pipeline) {
      const fn = pipeline.ingest || pipeline.createOrder || pipeline.intake || pipeline.handle;
      if (typeof fn === 'function') pipelineResult = fn.call(pipeline, Object.assign({ tenantId: tid }, order));
    }
  } catch (e) { pipelineResult = { error: e && e.message }; }
  return { order, pipelineResult, pipelineAvailable: !!pipeline };
}

module.exports = { newDraft, step, place, listOrders, pipelineAvailable: () => !!pipeline };
