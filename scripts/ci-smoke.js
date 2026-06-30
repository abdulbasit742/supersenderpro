'use strict';
/**
 * scripts/ci-smoke.js - CI aggregator. Runs every dependency-light smoke test + doctor
 * we ship, in a child process each, and fails the build if any fail.
 *
 * Designed to need NO database, NO Stripe, NO running server: everything uses the
 * json driver + dry-run flags. This protects the merged Phase 1/2 subsystems on every PR.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const env = Object.assign({}, process.env, {
  DB_DRIVER: process.env.DB_DRIVER || 'json',
  SALES_PIPELINE_DRY_RUN: 'true',
  ADMIN_ALERT_DRY_RUN: 'true',
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || 'ci-test-secret',
});

const targets = [];

// 1) every smoke test under tests/smoke
const smokeDir = path.join(ROOT, 'tests', 'smoke');
if (fs.existsSync(smokeDir)) {
  for (const f of fs.readdirSync(smokeDir)) {
    if (f.endsWith('Smoke.js')) targets.push(path.join('tests', 'smoke', f));
  }
}

// 2) doctors / verifiers that exit non-zero on failure
for (const s of ['scripts/db-doctor.js', 'scripts/health-verify.js']) {
  if (fs.existsSync(path.join(ROOT, s))) targets.push(s);
}

if (!targets.length) { console.log('No smoke targets found - nothing to run.'); process.exit(0); }

let failed = 0;
const results = [];
for (const rel of targets) {
  process.stdout.write('\n=== ' + rel + ' ===\n');
  try {
    execFileSync(process.execPath, [rel], { cwd: ROOT, env, stdio: 'inherit' });
    results.push({ rel, ok: true });
  } catch (e) {
    failed++;
    results.push({ rel, ok: false, code: e.status });
  }
}

console.log('\n================ CI SMOKE SUMMARY ================');
results.forEach((r) => console.log('  ' + (r.ok ? 'PASS' : 'FAIL') + '  ' + r.rel + (r.ok ? '' : ' (exit ' + r.code + ')')));
console.log('  ' + (results.length - failed) + '/' + results.length + ' passed');
console.log('=================================================');
process.exit(failed ? 1 : 0);
