// lib/aiSuite/selfTest.js
// ────────────────────────────────────────────────────────────────────
// On-demand AI-suite self-test. Programmatic wrapper around the offline smoke
// set so ops / the control panel can trigger a run and get structured results
// (instead of only running the CLI). Each smoke test runs in its own child
// process with a timeout; nothing here needs a model. Zero new npm deps.
// ───────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SMOKE_DIR = path.join(__dirname, '..', '..', 'tests', 'smoke');

function discover(filter) {
  if (!fs.existsSync(SMOKE_DIR)) return [];
  return fs.readdirSync(SMOKE_DIR)
    .filter(f => /Smoke\.js$/.test(f))
    .filter(f => !filter || f.toLowerCase().includes(String(filter).toLowerCase()))
    .sort();
}

function runOne(fileName, timeoutMs) {
  return new Promise((resolve) => {
    const file = path.join(SMOKE_DIR, fileName);
    const start = Date.now();
    let out = '';
    const child = spawn(process.execPath, [file], { stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, timeoutMs);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const timedOut = signal === 'SIGKILL';
      const checks = (out.match(/(\d+)\s+checks?\s+passed/i) || [])[1];
      resolve({ file: fileName, ok: !timedOut && code === 0, ms: Date.now() - start, checks: checks ? parseInt(checks, 10) : null, timedOut });
    });
    child.on('error', () => { clearTimeout(timer); resolve({ file: fileName, ok: false, ms: Date.now() - start, checks: null, error: true }); });
  });
}

/**
 * Run the offline smoke suite. Concurrency-limited so we don\'t fork 25 procs at
 * once. Returns a structured summary; never throws.
 */
async function run({ filter, timeoutMs = 30000, concurrency = 4 } = {}) {
  const files = discover(filter);
  if (!files.length) return { ok: false, error: 'no smoke tests found', total: 0, results: [] };
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < files.length) { const f = files[idx++]; results.push(await runOne(f, timeoutMs)); }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
  results.sort((a, b) => a.file.localeCompare(b.file));
  const passed = results.filter(r => r.ok).length;
  return { ok: passed === results.length, ranAt: new Date().toISOString(), total: results.length, passed, failed: results.length - passed, totalChecks: results.reduce((a, r) => a + (r.checks || 0), 0), results };
}

module.exports = { run, discover };
