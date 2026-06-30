'use strict';
/**
 * scripts/wire-admin-alerts.js - idempotently mount admin-alert router + start health polling.
 * Inserts an ADMIN ALERTS HOOK block before the server starts listening.
 * Safe to run multiple times. Usage: node scripts/wire-admin-alerts.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === ADMIN ALERTS HOOK ===',
  'try {',
  "  app.use('/api/admin-alerts', require('./routes/adminAlertRoutes'));",
  "  require('./lib/adminAlert').startPolling();",
  "  console.log('[AdminAlert] mounted at /api/admin-alerts');",
  '} catch (e) {',
  "  console.error('[AdminAlert] mount failed:', e && e.message);",
  '}',
  '// === END ADMIN ALERTS HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('ADMIN ALERTS HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) {
      src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index);
      fs.writeFileSync(SERVER, src);
      console.log('wired ADMIN ALERTS HOOK before listen().');
      return;
    }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired ADMIN ALERTS HOOK (appended at EOF - verify app is in scope).');
}

main();
