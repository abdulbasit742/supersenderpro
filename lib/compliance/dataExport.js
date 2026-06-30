'use strict';
/**
 * lib/compliance/dataExport.js - tenant data export + erasure (GDPR-style).
 * 'Download my data' and 'delete my data', implemented over the tenant-scoped repo (lib/db).
 *
 * exportTenant(tenantId): returns a JSON bundle of every known collection for that tenant.
 * eraseTenant(tenantId, confirm): permanently removes those rows. Requires confirm === tenantId
 * (an explicit, hard-to-trigger-by-accident confirmation). Returns counts removed.
 */
const repo = require('../db');

// All tenant-scoped collections we know about across subsystems.
const COLLECTIONS = [
  'customers', 'orders', 'quotes', 'inbox_messages', 'txns', 'webhook_endpoints', 'follow_ups',
  'users', 'subscriptions', 'usage', 'deals', 'carts', 'audit_log', 'api_keys',
];

async function exportTenant(tenantId) {
  repo.assertTenant(tenantId);
  const data = {};
  let totalRows = 0;
  for (const c of COLLECTIONS) {
    try { const rows = await repo.list(tenantId, c, {}); data[c] = rows; totalRows += rows.length; }
    catch { data[c] = []; }
  }
  // Redact secrets defensively even though they're hashed: drop passwordHash / keyHash / secret.
  for (const u of data.users || []) { delete u.passwordHash; delete u.resetTokenHash; }
  for (const k of data.api_keys || []) { delete k.keyHash; }
  for (const w of data.webhook_endpoints || []) { if (w.secret) w.secret = '(redacted)'; }
  return { tenantId, exportedAt: new Date().toISOString(), totalRows, collections: Object.keys(data), data };
}

async function eraseTenant(tenantId, confirm) {
  repo.assertTenant(tenantId);
  if (confirm !== tenantId) throw new Error('erase not confirmed: pass confirm === tenantId to proceed');
  const removed = {};
  for (const c of COLLECTIONS) {
    let n = 0;
    try { const rows = await repo.list(tenantId, c, {}); for (const r of rows) { if (await repo.remove(tenantId, c, r.id)) n++; } }
    catch {}
    removed[c] = n;
  }
  return { tenantId, erasedAt: new Date().toISOString(), removed, total: Object.values(removed).reduce((a, b) => a + b, 0) };
}

module.exports = { exportTenant, eraseTenant, COLLECTIONS };
