'use strict';
/**
 * scripts/wire-chatbot-builder.js - idempotently mount the Chatbot Flow Builder router in server.js.
 * Inserts a CHATBOT BUILDER HOOK block before the server starts listening.
 * Safe to run multiple times. Usage: node scripts/wire-chatbot-builder.js
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
const HOOK = [
  '',
  '// === CHATBOT BUILDER HOOK ===',
  'try {',
  "  app.use('/api/chatbot-builder', require('./routes/chatbotBuilderRoutes'));",
  "  console.log('[ChatbotBuilder] mounted at /api/chatbot-builder');",
  '} catch (e) {',
  "  console.error('[ChatbotBuilder] mount failed:', e && e.message);",
  '}',
  '// === END CHATBOT BUILDER HOOK ===',
  '',
].join('\n');

function main() {
  if (!fs.existsSync(SERVER)) { console.error('server.js not found at repo root - mount manually.'); process.exit(1); }
  let src = fs.readFileSync(SERVER, 'utf8');
  if (src.includes('CHATBOT BUILDER HOOK')) { console.log('already wired - nothing to do.'); return; }
  const anchors = [/\n[^\n]*\bserver\.listen\s*\(/, /\n[^\n]*\bapp\.listen\s*\(/, /\n[^\n]*httpServer\.listen\s*\(/];
  for (const re of anchors) {
    const m = src.match(re);
    if (m && m.index >= 0) {
      src = src.slice(0, m.index) + '\n' + HOOK + src.slice(m.index);
      fs.writeFileSync(SERVER, src);
      console.log('wired CHATBOT BUILDER HOOK before listen().');
      return;
    }
  }
  fs.writeFileSync(SERVER, src + '\n' + HOOK);
  console.log('wired CHATBOT BUILDER HOOK (appended at EOF - verify app is in scope).');
}

main();
