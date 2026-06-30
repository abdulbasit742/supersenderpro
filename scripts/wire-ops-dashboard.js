'use strict';
/**
 * scripts/wire-ops-dashboard.js - mount the ops dashboard route + start the uptime monitor.
 * Inserts an OPS DASHBOARD HOOK before listen(). Idempotent. Usage: node scripts/wire-ops-dashboard.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === OPS DASHBOARD HOOK ===',
  'try {',
  "  app.use('/api/ops', require('./routes/opsDashboardRoutes'));",
  "  require('./lib/observability/uptime').start();",
  "  console.log('[Ops] dashboard at /api/ops/ui, uptime monitor started');",
  '} catch (e) {',
  "  console.error('[Ops] dashboard mount failed:', e && e.message);",
  '}',
  '// === END OPS DASHBOARD HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('OPS DASHBOARD HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) { src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index); fs.writeFileSync(SERVER, src); console.log('wired OPS DASHBOARD HOOK before listen().'); return; }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired OPS DASHBOARD HOOK (appended at EOF - verify app is in scope).');
}

main();
