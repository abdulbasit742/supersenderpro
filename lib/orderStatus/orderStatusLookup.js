'use strict';
/**
 * Order Status Lookup (#114)
 * ---------------------------------------------------------------------------
 * Deterministic engine that answers "where is my order" style questions on
 * WhatsApp. It resolves an order by id / phone / fuzzy text, reads the current
 * state from the Order Extraction (#25) and Delivery Tracking (#70) stores
 * (best-effort require, never hard-fails), and produces a customer-ready reply.
 *
 * Conventions:
 *  - ZERO new npm deps (only node core).
 *  - Deterministic core works with NO model; Ollama only phrases the reply and
 *    falls back to a clean template when unreachable.
 *  - server.js is never touched; this is mounted by routes/orderStatusRoutes.js.
 *  - File-backed under data/orderStatus/ for any local fallback orders.
 *  - Tenant/store scoped: missing tenantId throws.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'orderStatus');

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
}

function requireTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('orderStatus: tenantId is required');
  }
  return tenantId;
}

function safeRequire(mod) {
  try { return require(mod); } catch (_) { return null; }
}

function readJsonSafe(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// Order resolution: try #25 order-extraction drafts, then #70 delivery store,
// then local file fallback. All best-effort.
// ---------------------------------------------------------------------------
function loadOrdersFromExtraction(tenantId) {
  const mod = safeRequire('../orderExtraction/orderExtraction')
    || safeRequire('../orderExtract/orderExtraction');
  if (mod && typeof mod.listOrders === 'function') {
    try { return mod.listOrders({ tenantId }) || []; } catch (_) {}
  }
  // file fallback used by #25
  const f = path.join(process.cwd(), 'data', 'orderExtraction', tenantId + '.json');
  const j = readJsonSafe(f);
  if (Array.isArray(j)) return j;
  if (j && Array.isArray(j.orders)) return j.orders;
  return [];
}

function loadShipments(tenantId) {
  const mod = safeRequire('../deliveryTracking/deliveryTracking')
    || safeRequire('../delivery/deliveryTracking');
  if (mod && typeof mod.listShipments === 'function') {
    try { return mod.listShipments({ tenantId }) || []; } catch (_) {}
  }
  const f = path.join(process.cwd(), 'data', 'deliveryTracking', tenantId + '.json');
  const j = readJsonSafe(f);
  if (Array.isArray(j)) return j;
  if (j && Array.isArray(j.shipments)) return j.shipments;
  return [];
}

function loadLocalOrders(tenantId) {
  const f = path.join(DATA_DIR, tenantId + '.json');
  const j = readJsonSafe(f);
  if (Array.isArray(j)) return j;
  if (j && Array.isArray(j.orders)) return j.orders;
  return [];
}

function normPhone(p) {
  return String(p || '').replace(/[^0-9]/g, '').slice(-10);
}

function normId(s) {
  return String(s || '').trim().toUpperCase();
}

// Pull an order id out of free text e.g. "where is order #A1024"
function extractOrderId(text) {
  if (!text) return null;
  const m = String(text).match(/#?\b([A-Z]{0,3}-?\d{3,})\b/i);
  return m ? normId(m[1]) : null;
}

function mergeOrderAndShipment(order, shipments) {
  const oid = normId(order.id || order.orderId || order.order_no);
  const ship = (shipments || []).find(function (s) {
    return normId(s.orderId || s.order_id || s.orderNo) === oid;
  });
  return {
    id: oid,
    customer: order.customer || order.name || null,
    phone: order.phone || order.msisdn || null,
    items: order.items || order.products || [],
    total: order.total != null ? order.total : (order.amount != null ? order.amount : null),
    orderStatus: order.status || 'received',
    placedAt: order.createdAt || order.placedAt || null,
    shipment: ship ? {
      status: ship.status || 'pending',
      courier: ship.courier || ship.carrier || null,
      trackingNo: ship.trackingNo || ship.tracking || null,
      eta: ship.eta || ship.expectedAt || null,
      lastUpdate: ship.updatedAt || ship.lastUpdate || null
    } : null
  };
}

/**
 * Resolve a single order for a tenant by id and/or phone and/or free text.
 * Returns the merged order object or null.
 */
function resolveOrder(opts) {
  opts = opts || {};
  const tenantId = requireTenant(opts.tenantId);
  const wantId = normId(opts.orderId || extractOrderId(opts.text));
  const wantPhone = normPhone(opts.phone);

  const orders = []
    .concat(loadOrdersFromExtraction(tenantId))
    .concat(loadLocalOrders(tenantId))
    .filter(Boolean);
  const shipments = loadShipments(tenantId);

  let match = null;
  if (wantId) {
    match = orders.find(function (o) {
      return normId(o.id || o.orderId || o.order_no) === wantId;
    });
  }
  if (!match && wantPhone) {
    // most recent order for that phone
    const byPhone = orders.filter(function (o) {
      return normPhone(o.phone || o.msisdn) === wantPhone;
    });
    byPhone.sort(function (a, b) {
      return new Date(b.createdAt || b.placedAt || 0) - new Date(a.createdAt || a.placedAt || 0);
    });
    match = byPhone[0] || null;
  }
  if (!match) return null;
  return mergeOrderAndShipment(match, shipments);
}

// ---------------------------------------------------------------------------
// Reply phrasing: deterministic template, optional Ollama enrichment.
// ---------------------------------------------------------------------------
function templateReply(order, lang) {
  if (!order) {
    return 'Sorry, mujhe is number ya order id ke against koi order nahi mila. Kya aap order id ya jo number use kiya tha bhej sakte hain?';
  }
  const lines = [];
  lines.push('Order ' + order.id + ' ka status:');
  if (order.shipment) {
    lines.push('• Shipment: ' + order.shipment.status
      + (order.shipment.courier ? ' (' + order.shipment.courier + ')' : ''));
    if (order.shipment.trackingNo) lines.push('• Tracking: ' + order.shipment.trackingNo);
    if (order.shipment.eta) lines.push('• Expected: ' + order.shipment.eta);
  } else {
    lines.push('• Status: ' + order.orderStatus + ' (abhi dispatch nahi hua)');
  }
  if (order.total != null) lines.push('• Total: ' + order.total);
  return lines.join('\n');
}

async function phraseWithAI(order, opts) {
  const det = templateReply(order, opts && opts.lang);
  const brain = safeRequire('../../ai/aiBrain') || safeRequire('../../ai/aiBrain.js');
  if (!brain || typeof brain.processPrompt !== 'function') return det;
  const facts = order ? JSON.stringify(order) : 'NO_ORDER_FOUND';
  const prompt =
    'You are a WhatsApp support agent. Using ONLY these facts, write a short, '
    + 'friendly status reply in the customer\'s language (Roman Urdu/English ok). '
    + 'Do not invent tracking numbers or dates.\nFACTS: ' + facts
    + '\nFallback text if unsure:\n' + det;
  try {
    const out = await brain.processPrompt(prompt, { feature: 'order-status', maxTokens: 220 });
    const txt = (out && (out.text || out.content || out.reply)) || (typeof out === 'string' ? out : '');
    return (txt && txt.trim()) ? txt.trim() : det;
  } catch (_) {
    return det; // Ollama unreachable -> deterministic template
  }
}

/**
 * Main entry: answer an order-status question.
 * Returns { found, order, reply }.
 */
async function answer(opts) {
  opts = opts || {};
  requireTenant(opts.tenantId);
  const order = resolveOrder(opts);
  const reply = await phraseWithAI(order, opts);
  return { found: !!order, order: order || null, reply: reply };
}

function saveLocalOrder(tenantId, order) {
  requireTenant(tenantId);
  ensureDir(DATA_DIR);
  const f = path.join(DATA_DIR, tenantId + '.json');
  const cur = loadLocalOrders(tenantId);
  cur.push(order);
  fs.writeFileSync(f, JSON.stringify(cur, null, 2));
  return order;
}

module.exports = {
  resolveOrder: resolveOrder,
  answer: answer,
  extractOrderId: extractOrderId,
  templateReply: templateReply,
  saveLocalOrder: saveLocalOrder,
  _internal: { normPhone: normPhone, normId: normId, mergeOrderAndShipment: mergeOrderAndShipment }
};
