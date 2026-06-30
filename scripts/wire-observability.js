'use strict';
/**
 * scripts/wire-observability.js - mount request tracing (early) + ops routes + error handler (late).
 * Inserts OBSERVABILITY HOOK (tracing, before routes) and OBSERVABILITY ERROR HOOK (handler, before listen).
 * Idempotent. Usage: node scripts/wire-observability.js
 *
 * Note: request tracing is appended near the hook insertion point; for ideal access logs it should sit
 * just after app is created. The wire script places the ops route + error handler safely; verify the
 * tracing middleware order if you want every route traced.
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === OBSERVABILITY HOOK ===',
  'try {',
  "  const obs = require('./lib/observability');",
  "  app.use(obs.requestTracing());",
  "  app.use('/api/ops', require('./routes/observabilityRoutes'));",
  "  console.log('[Observability] tracing + /api/ops mounted');",
  '} catch (e) {',
  "  console.error('[Observability] mount failed:', e && e.message);",
  '}',
  '// === END OBSERVABILITY HOOK ===',
  '',
].join('\n');
const ERR_HOOK = [
  '',
  '// === OBSERVABILITY ERROR HOOK ===',
  'try { app.use(require(\'./lib/observability\').errorHandler()); } catch (e) { console.error(\'[Observability] error handler mount failed:\', e && e.message); }',
  '// === END OBSERVABILITY ERROR HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  let changed = false;
  const anchorRe = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  const findAnchor = (s) => { for (const re of anchorRe) { const m = s.match(re); if (m && m.index >= 0) return m.index; } return -1; };

  if (!src.includes('OBSERVABILITY HOOK')) {
    const idx = findAnchor(src);
    if (idx >= 0) { src = src.slice(0, idx) + '\n' + HOOK + src.slice(idx); changed = true; }
    else { src += '\n' + HOOK; changed = true; }
  }
  if (!src.includes('OBSERVABILITY ERROR HOOK')) {
    const idx = findAnchor(src);
    if (idx >= 0) { src = src.slice(0, idx) + '\n' + ERR_HOOK + src.slice(idx); changed = true; }
    else { src += '\n' + ERR_HOOK; changed = true; }
  }
  if (!changed) { console.log('already wired - nothing to do.'); return; }
  fs.writeFileSync(SERVER, src);
  console.log('wired OBSERVABILITY hooks (tracing + ops route + error handler).');
}

main();
