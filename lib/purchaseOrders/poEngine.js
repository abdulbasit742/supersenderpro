// lib/purchaseOrders/poEngine.js
// Purchase Order lifecycle: draft -> ordered -> partial -> received | cancelled.
// Receiving restocks Inventory (#66) when present (best-effort, advisory).

'use strict';

const { readJson, writeJson, nextId } = require('./store');
const { POS_FILE, PO_STATES, DEFAULT_STATE, REORDER_MULT } = require('./config');
const { getSupplier } = require('./supplierStore');

// Optional sibling department: Inventory (#66). Degrades to no-op if absent.
function inventory() {
  try { return require('../inventory'); } catch (_) { return null; }
}

function requireTenant(tenantId) {
  if (!tenantId) throw new Error('tenantId required');
  return String(tenantId);
}

function loadAll() {
  return readJson(POS_FILE, {});
}

function listPOs(tenantId, filter) {
  const t = requireTenant(tenantId);
  const all = loadAll();
  let rows = Object.values(all[t] || {});
  if (filter && filter.state) rows = rows.filter((p) => p.state === filter.state);
  if (filter && filter.supplierId) rows = rows.filter((p) => p.supplierId === filter.supplierId);
  return rows;
}

function getPO(tenantId, id) {
  const t = requireTenant(tenantId);
  const all = loadAll();
  return (all[t] || {})[id] || null;
}

function normalizeLines(lines) {
  return (lines || []).map((l) => ({
    sku: String(l.sku || '').trim(),
    name: l.name || null,
    qty: Math.max(0, Number(l.qty || 0)),
    received: 0,
    unitCost: Math.max(0, Number(l.unitCost || 0))
  })).filter((l) => l.sku && l.qty > 0);
}

function lineTotal(l) { return l.qty * l.unitCost; }

function createPO(tenantId, data) {
  const t = requireTenant(tenantId);
  if (!data || !data.supplierId) throw new Error('supplierId required');
  const sup = getSupplier(t, data.supplierId);
  if (!sup) throw new Error('supplier not found');
  const lines = normalizeLines(data.lines);
  if (!lines.length) throw new Error('at least one valid line required');
  const all = loadAll();
  all[t] = all[t] || {};
  const id = nextId('po');
  const now = new Date().toISOString();
  const rec = {
    id,
    tenantId: t,
    supplierId: sup.id,
    supplierName: sup.name,
    state: DEFAULT_STATE,
    lines,
    currency: data.currency || undefined,
    notes: data.notes || '',
    total: lines.reduce((s, l) => s + lineTotal(l), 0),
    createdAt: now,
    updatedAt: now,
    orderedAt: null,
    receivedAt: null
  };
  all[t][id] = rec;
  writeJson(POS_FILE, all);
  return rec;
}

function setState(tenantId, id, state) {
  const t = requireTenant(tenantId);
  if (!PO_STATES.includes(state)) throw new Error('invalid state');
  const all = loadAll();
  const rec = (all[t] || {})[id];
  if (!rec) throw new Error('PO not found');
  rec.state = state;
  if (state === 'ordered' && !rec.orderedAt) rec.orderedAt = new Date().toISOString();
  rec.updatedAt = new Date().toISOString();
  all[t][id] = rec;
  writeJson(POS_FILE, all);
  return rec;
}

// Receive items against a PO. receipts = [{sku, qty}].
// Restocks Inventory (#66) when available. Advisory: never fails if inventory absent.
function receive(tenantId, id, receipts) {
  const t = requireTenant(tenantId);
  const all = loadAll();
  const rec = (all[t] || {})[id];
  if (!rec) throw new Error('PO not found');
  if (rec.state === 'cancelled') throw new Error('cannot receive a cancelled PO');

  const map = {};
  (receipts || []).forEach((r) => {
    const sku = String(r.sku || '').trim();
    if (sku) map[sku] = (map[sku] || 0) + Math.max(0, Number(r.qty || 0));
  });

  const inv = inventory();
  const restocked = [];
  rec.lines.forEach((l) => {
    const incoming = map[l.sku] || 0;
    if (incoming <= 0) return;
    const room = Math.max(0, l.qty - l.received);
    const applied = Math.min(incoming, room);
    if (applied <= 0) return;
    l.received += applied;
    if (inv && typeof inv.restock === 'function') {
      try { inv.restock(t, l.sku, applied, { reason: 'PO:' + id }); restocked.push({ sku: l.sku, qty: applied, synced: true }); }
      catch (_) { restocked.push({ sku: l.sku, qty: applied, synced: false }); }
    } else if (inv && typeof inv.adjustStock === 'function') {
      try { inv.adjustStock(t, l.sku, applied, { reason: 'PO:' + id }); restocked.push({ sku: l.sku, qty: applied, synced: true }); }
      catch (_) { restocked.push({ sku: l.sku, qty: applied, synced: false }); }
    } else {
      restocked.push({ sku: l.sku, qty: applied, synced: false });
    }
  });

  const allReceived = rec.lines.every((l) => l.received >= l.qty);
  const anyReceived = rec.lines.some((l) => l.received > 0);
  rec.state = allReceived ? 'received' : (anyReceived ? 'partial' : rec.state);
  if (allReceived && !rec.receivedAt) rec.receivedAt = new Date().toISOString();
  rec.updatedAt = new Date().toISOString();
  all[t][id] = rec;
  writeJson(POS_FILE, all);
  return { po: rec, restocked };
}

function cancelPO(tenantId, id) {
  return setState(tenantId, id, 'cancelled');
}

// Reorder suggestions: pull low-stock items from Inventory (#66) if present.
// Returns advisory list; never auto-creates POs.
function reorderSuggestions(tenantId) {
  const t = requireTenant(tenantId);
  const inv = inventory();
  if (!inv) return { available: false, suggestions: [] };
  let low = [];
  try {
    if (typeof inv.lowStock === 'function') low = inv.lowStock(t) || [];
    else if (typeof inv.listLowStock === 'function') low = inv.listLowStock(t) || [];
  } catch (_) { low = []; }
  const suggestions = low.map((item) => {
    const onHand = Number(item.onHand != null ? item.onHand : item.qty || 0);
    const rp = Number(item.reorderPoint != null ? item.reorderPoint : 0);
    const target = rp * REORDER_MULT;
    const suggestQty = Math.max(0, Math.ceil(target - onHand));
    return { sku: item.sku, name: item.name || null, onHand, reorderPoint: rp, suggestQty };
  }).filter((s) => s.suggestQty > 0);
  return { available: true, suggestions };
}

module.exports = {
  listPOs, getPO, createPO, setState, receive, cancelPO, reorderSuggestions,
  _internals: { normalizeLines, lineTotal }
};
