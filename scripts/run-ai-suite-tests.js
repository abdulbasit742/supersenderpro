#!/usr/bin/env node
// scripts/run-ai-suite-tests.js
// ───────────────────────────────────────────────────────────────────
// One command to run the WHOLE AI-suite offline smoke test set. Discovers every
// tests/smoke/*Smoke.js, runs each in its own node child process with a timeout,
// and prints a PASS/FAIL table + writes a JSON report to data/selftest/. Exits
// non-zero if any test fails, so it works as a CI gate and a local pre-merge
// check. Every smoke test is offline-safe (no model required). Zero new deps.
//
// Usage:
//   node scripts/run-ai-suite-tests.js
//   node scripts/run-ai-suite-tests.js --timeout 30000
//   node scripts/run-ai-suite-tests.js --filter support   (only matching files)
// ───────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

const SMOKE_DIR = path.join(__dirname, '..', 'tests', 'smoke');
const TIMEOUT = parseInt(val('--timeout', '30000'), 10);
const FILTER = val('--filter', null);
const OUT_DIR = path.join(__dirname, '..', 'data', 'selftest');

function discover() {
  if (!fs.existsSync(SMOKE_DIR)) return [];
  return fs.readdirSync(SMOKE_DIR)
    .filter(f => /Smoke\.js$/.test(f))
    .filter(f => !FILTER || f.toLowerCase().includes(FILTER.toLowerCase()))
    .sort()
    .map(f => path.join(SMOKE_DIR, f));
}

function runOne(file) {
  const start = Date.now();
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8', timeout: TIMEOUT });
  const ms = Date.now() - start;
  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  const ok = !timedOut && r.status === 0;
  // pull the "N checks passed" line if present
  const out = (r.stdout || '') + (r.stderr || '');
  const checks = (out.match(/(\d+)\s+checks?\s+passed/i) || [])[1] || null;
  return { file: path.basename(file), ok, ms, checks: checks ? parseInt(checks, 10) : null, timedOut, status: r.status, output: out.trim() };
}

(function main() {
  const files = discover();
  if (!files.length) { console.error('No tests/smoke/*Smoke.js files found.'); process.exit(1); }

  console.log(`\n\u2500\u2500 AI Suite self-test \u2500\u2500  (${files.length} smoke tests, timeout ${TIMEOUT}ms${FILTER ? `, filter "${FILTER}"` : ''})\n`);
  const results = [];
  for (const f of files) {
    process.stdout.write(`  running ${path.basename(f).padEnd(34)} `);
    const res = runOne(f);
    results.push(res);
    const tag = res.ok ? '\u2713 PASS' : (res.timedOut ? '\u23f1 TIMEOUT' : '\u2717 FAIL');
    console.log(`${tag}  ${res.checks != null ? res.checks + ' checks, ' : ''}${res.ms}ms`);
    if (!res.ok) {
      // show the last few lines of failing output for quick diagnosis
      const tail = res.output.split('\n').slice(-6).join('\n      ');
      console.log('      \u2514\u2500 ' + tail + '\n');
    }
  }

  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  const totalChecks = results.reduce((a, r) => a + (r.checks || 0), 0);

  console.log('\n\u2500\u2500 Summary \u2500\u2500');
  console.log(`  ${passed}/${results.length} suites passed  \u00b7  ${totalChecks} checks  \u00b7  ${failed} failing`);

  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const report = { ranAt: new Date().toISOString(), total: results.length, passed, failed, totalChecks, results: results.map(({ output, ...r }) => r) };
    fs.writeFileSync(path.join(OUT_DIR, 'last-run.json'), JSON.stringify(report, null, 2));
    console.log(`  report: data/selftest/last-run.json`);
  } catch (e) { console.error('  (could not write report:', e.message + ')'); }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
})();
