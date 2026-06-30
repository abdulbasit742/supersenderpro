'use strict';
/**
 * scripts/wire-interactive-templates.js - idempotently mount the Interactive Templates router.
 * Inserts an INTERACTIVE TEMPLATES HOOK block before the server starts listening.
 * Safe to run multiple times. Usage: node scripts/wire-interactive-templates.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === INTERACTIVE TEMPLATES HOOK ===',
  'try {',
  "  app.use('/api/interactive-templates', require('./routes/interactiveTemplatesRoutes'));",
  "  console.log('[InteractiveTemplates] mounted at /api/interactive-templates');",
  '} catch (e) {',
  "  console.error('[InteractiveTemplates] mount failed:', e && e.message);",
  '}',
  '// === END INTERACTIVE TEMPLATES HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('INTERACTIVE TEMPLATES HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) {
      src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index);
      fs.writeFileSync(SERVER, src);
      console.log('wired INTERACTIVE TEMPLATES HOOK before listen().');
      return;
    }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired INTERACTIVE TEMPLATES HOOK (appended at EOF - verify app is in scope).');
}

main();
