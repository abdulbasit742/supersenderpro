'use strict';
/**
 * scripts/wire-all.js - run every subsystem wiring script in one shot.
 * Each wire-*.js is idempotent, so this is safe to run repeatedly (e.g. on deploy).
 * Usage: node scripts/wire-all.js
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WIRERS = [
  'scripts/wire-auth.js',
  'scripts/wire-billing.js',
  'scripts/wire-health-check.js',
  'scripts/wire-admin-alerts.js',
  'scripts/wire-sales-pipeline.js',
  'scripts/wire-contacts.js',
];

let ran = 0, missing = 0, failed = 0;
for (const rel of WIRERS) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.log('SKIP (not found): ' + rel); missing++; continue; }
  process.stdout.write('\n=== ' + rel + ' ===\n');
  try { execFileSync(process.execPath, [abs], { cwd: ROOT, stdio: 'inherit' }); ran++; }
  catch (e) { console.error('FAILED: ' + rel + ' - ' + e.message); failed++; }
}

console.log('\n================ WIRE-ALL SUMMARY ================');
console.log(' wired: ' + ran + ' missing: ' + missing + ' failed: ' + failed);
console.log(' Verify server.js now contains: AUTH HOOK, BILLING HOOK, HEALTH CHECK HOOK, ADMIN ALERTS HOOK, SALES PIPELINE HOOK, CONTACTS HOOK');
console.log('==================================================');
process.exit(failed ? 1 : 0);
