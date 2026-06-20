// lib/tenantIsolation/storeBoundaryScanner.js — Scans lib/ source for tenant/PII/secret field usage. Source-only; never reads runtime data.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { TENANT_FIELDS, PII_FIELDS, SECRET_FIELDS } = require('./dataShapeCatalog');

function listSourceFiles(dir, acc, depth) {
  if (depth > 3) return acc;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_e) { return acc; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listSourceFiles(full, acc, depth + 1);
    else if (e.name.endsWith('.js')) acc.push(full);
  }
  return acc;
}

function scan() {
  // Source-only scan of lib/. Does NOT open data/, logs/, uploads/, or any runtime store.
  const files = listSourceFiles(path.join(ROOT, 'lib'), [], 0);
  const tenant = new Set(); const pii = new Set(); const secret = new Set();
  let scanned = 0;
  const boundaryWarnings = [];
  files.forEach((f) => {
    let c = '';
    try { c = fs.readFileSync(f, 'utf8'); } catch (_e) { return; }
    scanned += 1;
    TENANT_FIELDS.forEach((k) => { if (c.includes(k)) tenant.add(k); });
    PII_FIELDS.forEach((k) => { if (new RegExp(`\\b${k}\\b`).test(c)) pii.add(k); });
    SECRET_FIELDS.forEach((k) => { if (new RegExp(`\\b${k}\\b`).test(c)) secret.add(k); });
  });
  if (pii.size && !tenant.size) boundaryWarnings.push('pii_fields_without_tenant_scope');
  return {
    storesScanned: scanned,
    tenantFieldsFound: [...tenant],
    piiFieldsFound: [...pii],
    secretRiskFieldsFound: [...secret],
    boundaryWarnings,
    nextSteps: boundaryWarnings.length ? ['ensure PII reads are tenant-scoped and redacted'] : ['source field usage looks scoped'],
  };
}
module.exports = { scan };
