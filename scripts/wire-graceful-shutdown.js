'use strict';
/**
 * scripts/wire-graceful-shutdown.js - install lifecycle handlers right after the server listens.
 * Inserts a GRACEFUL SHUTDOWN HOOK immediately AFTER the listen() call. Idempotent.
 * Usage: node scripts/wire-graceful-shutdown.js
 *
 * It tries to detect the server handle variable (server / httpServer / app) from the listen call.
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('GRACEFUL SHUTDOWN HOOK')) { console.log('already wired - nothing to do.'); return; }

  // Find a listen() call and the handle it is called on, e.g. `server.listen(`, `httpServer.listen(`, `app.listen(`.
  const m = src.match(/\b([A-Za-z_$][\w$]*)\.listen\s*\(/);
  const handle = m ? m[1] : 'server';
  const hook = [
    '',
    '// === GRACEFUL SHUTDOWN HOOK ===',
    'try {',
    "  require('./lib/lifecycle').install(typeof " + handle + " !== 'undefined' ? " + handle + ' : null);',
    "  console.log('[Lifecycle] graceful shutdown installed');",
    '} catch (e) {',
    "  console.error('[Lifecycle] install failed:', e && e.message);",
    '}',
    '// === END GRACEFUL SHUTDOWN HOOK ===',
    '',
  ].join('\n');

  // Insert after the line containing the listen call.
  const idx = src.search(/[^\n]*\.listen\s*\([^\n]*\n/);
  if (idx >= 0) {
    const lineEnd = src.indexOf('\n', src.indexOf('.listen', idx)) + 1;
    src = src.slice(0, lineEnd) + hook + src.slice(lineEnd);
  } else {
    src += hook;
  }
  fs.writeFileSync(SERVER, src);
  console.log('wired GRACEFUL SHUTDOWN HOOK (handle: ' + handle + ').');
}

main();
