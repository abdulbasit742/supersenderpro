'use strict';
/**
 * scripts/wire-conversational-support.js - idempotently mount the Conversational Support router in
 * server.js. Inserts a CONVERSATIONAL SUPPORT HOOK block before the server starts listening.
 * Safe to run multiple times. Usage: node scripts/wire-conversational-support.js
 * (Alternatively the router is already mounted via lib/bootstrap/registerSubsystems.)
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === CONVERSATIONAL SUPPORT HOOK ===',
  'try {',
  "  app.use('/api/conversational-support', require('./routes/conversationalSupportRoutes'));",
  "  console.log('[ConvSupport] mounted at /api/conversational-support');",
  '} catch (e) {',
  "  console.error('[ConvSupport] mount failed:', e && e.message);",
  '}',
  '// === END CONVERSATIONAL SUPPORT HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('CONVERSATIONAL SUPPORT HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) {
      src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index);
      fs.writeFileSync(SERVER, src);
      console.log('wired CONVERSATIONAL SUPPORT HOOK before listen().');
      return;
    }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired CONVERSATIONAL SUPPORT HOOK (appended at EOF - verify app is in scope).');
}

main();
