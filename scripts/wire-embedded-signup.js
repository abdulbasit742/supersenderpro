'use strict';
/**
 * scripts/wire-embedded-signup.js - idempotently mount the Embedded Signup router in server.js.
 * Inserts an EMBEDDED SIGNUP HOOK block before the server starts listening.
 * Safe to run multiple times. Usage: node scripts/wire-embedded-signup.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === EMBEDDED SIGNUP HOOK ===',
  'try {',
  "  app.use('/api/embedded-signup', require('./routes/embeddedSignupRoutes'));",
  "  console.log('[EmbeddedSignup] mounted at /api/embedded-signup');",
  '} catch (e) {',
  "  console.error('[EmbeddedSignup] mount failed:', e && e.message);",
  '}',
  '// === END EMBEDDED SIGNUP HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('EMBEDDED SIGNUP HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) {
      src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index);
      fs.writeFileSync(SERVER, src);
      console.log('wired EMBEDDED SIGNUP HOOK before listen().');
      return;
    }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired EMBEDDED SIGNUP HOOK (appended at EOF - verify app is in scope).');
}

main();
