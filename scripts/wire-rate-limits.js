'use strict';
/**
 * scripts/wire-rate-limits.js - apply rate-limit guards at the server without editing each route.
 * Inserts a RATE LIMIT HOOK that mounts:
 *   - strict authGuard on /api/auth (brute-force protection)
 *   - webhookGuard on /api/billing/webhook
 *   - a general apiGuard on /api
 * Placed before route mounts ideally; this hook inserts before listen() as a safe default.
 * Idempotent. Usage: node scripts/wire-rate-limits.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === RATE LIMIT HOOK ===',
  'try {',
  "  const guards = require('./lib/security/guards');",
  "  app.use('/api/auth', guards.authGuard);",
  "  app.use('/api/billing/webhook', guards.webhookGuard);",
  "  app.use('/api', guards.apiGuard);",
  "  console.log('[Security] rate-limit guards applied (auth/webhook/api)');",
  '} catch (e) {',
  "  console.error('[Security] rate-limit wiring failed:', e && e.message);",
  '}',
  '// === END RATE LIMIT HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('RATE LIMIT HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) { src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index); fs.writeFileSync(SERVER, src); console.log('wired RATE LIMIT HOOK before listen().'); console.log('NOTE: for best effect, ensure these run before your route handlers; move the block up if routes are mounted after listen-anchor.'); return; }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired RATE LIMIT HOOK (appended at EOF - verify ordering vs route mounts).');
}

main();
