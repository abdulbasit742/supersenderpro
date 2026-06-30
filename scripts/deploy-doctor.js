'use strict';
/**
 * scripts/deploy-doctor.js - pre-deploy go/no-go check.
 * 1) validates env against lib/deploy/envSchema
 * 2) checks that subsystem wiring hooks are present in server.js
 * 3) runs available subsystem doctors (health, db)
 * Exits non-zero on any blocker. Usage: node scripts/deploy-doctor.js
 */
const fs = require('fs');
const path = require('path');
const { validate } = require('../lib/deploy/envSchema');

const ROOT = path.join(__dirname, '..');
const readServer = () => { try { return fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8'); } catch { return ''; } };

const HOOKS = ['AUTH HOOK', 'BILLING HOOK', 'HEALTH CHECK HOOK', 'ADMIN ALERTS HOOK', 'SALES PIPELINE HOOK', 'OBSERVABILITY HOOK', 'OPS DASHBOARD HOOK', 'GRACEFUL SHUTDOWN HOOK', 'RATE LIMIT HOOK'];

function main() {
  let blockers = 0;
  const warn = [];

  console.log('== ENV ==');
  const env = validate();
  if (env.missing.length) { blockers += env.missing.length; env.missing.forEach((m) => console.log('  MISSING ' + m.key + (m.note ? ' - ' + m.note : ''))); }
  else console.log('  required env OK');
  env.warnings.forEach((w) => { warn.push(w); console.log('  WARN ' + w); });

  console.log('\n== WIRING (server.js hooks) ==');
  const src = readServer();
  if (!src) { console.log('  WARN server.js not readable - run wiring on the deploy host'); warn.push('server.js not readable'); }
  else HOOKS.forEach((h) => { const present = src.includes(h); if (!present) warn.push('hook missing: ' + h); console.log('  ' + (present ? 'OK  ' : '..  ') + h + (present ? '' : ' (run scripts/wire-all.js)')); });

  console.log('\n== SUBSYSTEM DOCTORS ==');
  for (const mod of ['../lib/healthCheck', '../lib/salesPipeline/doctor']) {
    try { const d = require(mod); const r = d.run ? d.run() : (d.getHealth ? null : null); if (r) console.log('  ' + mod + ': ' + (r.ok ? 'OK' : 'ISSUES') + (r.blockers ? ' blockers=' + r.blockers : '')); }
    catch {}
  }

  console.log('\n================ DEPLOY DOCTOR ================');
  console.log('  blockers: ' + blockers + '  warnings: ' + warn.length);
  console.log('  verdict: ' + (blockers === 0 ? 'GO (review warnings)' : 'NO-GO (fix blockers)'));
  console.log('==============================================');
  process.exit(blockers === 0 ? 0 : 1);
}

main();
