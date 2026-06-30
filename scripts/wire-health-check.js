'use strict';
/**
 * scripts/wire-health-check.js - idempotently mount the health router in server.js.
 * Inserts a HEALTH CHECK HOOK block before the server starts listening.
 * Safe to run multiple times. Usage: node scripts/wire-health-check.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === HEALTH CHECK HOOK ===',
  'try {',
  "  app.use('/api/health', require('./routes/healthRoutes'));",
  "  console.log('[HealthCheck] mounted at /api/health');",
  '} catch (e) {',
  "  console.error('[HealthCheck] mount failed:', e && e.message);",
  '}',
  '// === END HEALTH CHECK HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('HEALTH CHECK HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) {
      src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index);
      fs.writeFileSync(SERVER, src);
      console.log('wired HEALTH CHECK HOOK before listen().');
      return;
    }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired HEALTH CHECK HOOK (appended at EOF - verify app is in scope).');
}

main();
