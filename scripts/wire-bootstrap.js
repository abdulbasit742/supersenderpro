'use strict';
/**
 * scripts/wire-bootstrap.js - replace the 9 individual wire hooks with ONE call.
 * Inserts a single SUBSYSTEMS HOOK that calls registerSubsystems.registerAll(app, server)
 * right after the server starts listening. Idempotent.
 *
 * This supersedes wire-auth/billing/health/admin-alerts/sales-pipeline/observability/
 * ops-dashboard/graceful-shutdown/rate-limits when you prefer a single insertion point.
 * (Those individual scripts still work; use whichever fits your server.js.)
 *
 * Usage: node scripts/wire-bootstrap.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('SUBSYSTEMS HOOK')) { console.log('already wired - nothing to do.'); return; }

  const m = src.match(/\b([A-Za-z_$][\w$]*)\.listen\s*\(/);
  const handle = m ? m[1] : 'server';
  const hook = [
    '',
    '// === SUBSYSTEMS HOOK (single bootstrap) ===',
    'try {',
    "  require('./lib/bootstrap/registerSubsystems').registerAll(app, typeof " + handle + " !== 'undefined' ? " + handle + ' : null);',
    "  console.log('[Bootstrap] all subsystems registered');",
    '} catch (e) {',
    "  console.error('[Bootstrap] registerAll failed:', e && e.message);",
    '}',
    '// === END SUBSYSTEMS HOOK ===',
    '',
  ].join('\n');

  const idx = src.search(/[^\n]*\.listen\s*\([^\n]*\n/);
  if (idx >= 0) {
    const lineEnd = src.indexOf('\n', src.indexOf('.listen', idx)) + 1;
    src = src.slice(0, lineEnd) + hook + src.slice(lineEnd);
  } else {
    src += hook;
  }
  fs.writeFileSync(SERVER, src);
  console.log('wired SUBSYSTEMS HOOK (single registerAll, handle: ' + handle + ').');
  console.log('NOTE: request tracing + rate-limit guards run inside registerAll; if you want them BEFORE other routes defined earlier in server.js, call registerAll earlier (after app is created) instead of after listen().');
}

main();
