'use strict';
/**
 * scripts/wire-contacts.js - idempotently mount the Contacts + Segmentation router in server.js.
 * Inserts a CONTACTS HOOK block before the server starts listening.
 * Safe to run multiple times. Usage: node scripts/wire-contacts.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === CONTACTS HOOK ===',
  'try {',
  "  app.use('/api/contacts', require('./routes/contactsRoutes'));",
  "  console.log('[Contacts] mounted at /api/contacts');",
  '} catch (e) {',
  "  console.error('[Contacts] mount failed:', e && e.message);",
  '}',
  '// === END CONTACTS HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('CONTACTS HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) {
      src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index);
      fs.writeFileSync(SERVER, src);
      console.log('wired CONTACTS HOOK before listen().');
      return;
    }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired CONTACTS HOOK (appended at EOF - verify app is in scope).');
}

main();
