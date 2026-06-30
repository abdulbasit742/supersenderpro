'use strict';
/**
 * scripts/wire-billing.js - idempotently mount the billing router in server.js.
 * Inserts a BILLING HOOK block before the server starts listening. Safe to run repeatedly.
 * Usage: node scripts/wire-billing.js
 *
 * IMPORTANT: the /webhook/stripe route uses express.raw internally, so it must NOT be behind
 * a global express.json() that consumes the body first. The router defines raw locally to
 * minimize that risk, but for production verify the webhook path is registered before json().
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === BILLING HOOK ===',
  'try {',
  "  app.use('/api/billing', require('./routes/billingRoutes'));",
  "  console.log('[Billing] mounted at /api/billing');",
  '} catch (e) {',
  "  console.error('[Billing] mount failed:', e && e.message);",
  '}',
  '// === END BILLING HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('BILLING HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) {
      src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index);
      fs.writeFileSync(SERVER, src);
      console.log('wired BILLING HOOK before listen().');
      return;
    }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired BILLING HOOK (appended at EOF - verify app is in scope).');
}

main();
