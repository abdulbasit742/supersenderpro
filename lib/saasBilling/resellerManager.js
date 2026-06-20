// lib/saasBilling/resellerManager.js — Manage resellers + tenant assignments.
// Adapts the EXISTING lib/resellerNetwork.js (phone-keyed) without rebuilding it.
// All emails/phones are masked. Never processes real payouts.

const store = require('./store');
const resellerStore = require('./resellerStore');
const commissionTracker = require('./commissionTracker');
const { maskEmail, maskPhone } = require('./privacy');

let legacy = null;
try { legacy = require('../resellerNetwork'); } catch (_e) { legacy = null; }

function registerReseller({ name, email, phone, commissionRate = 0.15 } = {}) {
  const reseller = {
    id: store.genId('res'),
    name: String(name || 'Reseller'),
    emailMasked: maskEmail(email),
    phoneMasked: maskPhone(phone),
    status: 'active',
    assignedTenants: [],
    commissionRate: Number(commissionRate),
    payoutStatus: 'none',
    createdAt: store.nowIso(),
  };
  return resellerStore.upsertReseller(reseller);
}

function assignTenant(resellerId, tenantId) {
  const r = resellerStore.getReseller(resellerId);
  if (!r) throw new Error('reseller not found');
  const tid = String(tenantId);
  if (!r.assignedTenants.includes(tid)) r.assignedTenants.push(tid);
  return resellerStore.upsertReseller(r);
}

function listResellers() {
  const local = resellerStore.allResellers();
  // Surface legacy resellers read-only (masked), without importing their PII.
  let legacyCount = 0;
  if (legacy) {
    try { const raw = store.readDataFile('resellers.json', null); legacyCount = raw && Array.isArray(raw.resellers) ? raw.resellers.length : 0; } catch (_e) { /* ignore */ }
  }
  return { resellers: local, legacyResellerCount: legacyCount, legacyAvailable: !!legacy };
}

function commissions(resellerId) { return commissionTracker.summary(resellerId); }

// Export a privacy-safe commission report (JSON-ready) across all resellers.
function commissionReport() {
  return resellerStore.allResellers().map((r) => ({
    resellerId: r.id, name: r.name, assignedTenants: r.assignedTenants.length,
    ...commissionTracker.summary(r.id),
  }));
}

module.exports = { registerReseller, assignTenant, listResellers, commissions, commissionReport, recordCommission: commissionTracker.recordForInvoice, legacyAvailable: !!legacy };
