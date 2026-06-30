'use strict';
/**
 * scripts/wire-auth.js - idempotently mount the auth router in server.js.
 * Inserts an AUTH HOOK block before the server starts listening. Safe to run repeatedly.
 * Usage: node scripts/wire-auth.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === AUTH HOOK ===',
  'try {',
  "  app.use('/api/auth', require('./routes/authRoutes'));",
  "  console.log('[Auth] mounted at /api/auth');",
  '} catch (e) {',
  "  console.error('[Auth] mount failed:', e && e.message);",
  '}',
  '// === END AUTH HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('AUTH HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) {
      src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index);
      fs.writeFileSync(SERVER, src);
      console.log('wired AUTH HOOK before listen().');
      return;
    }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired AUTH HOOK (appended at EOF - verify app is in scope).');
}

main();
