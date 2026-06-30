'use strict';
/**
 * scripts/chatbot-builder-check.js - smoke test for the Chatbot Flow Builder.
 * Seeds the example flow into an isolated tenant, drives a full simulated conversation
 * (forced dry-run, no sends), and asserts the engine advances + hands off correctly.
 * Usage: node scripts/chatbot-builder-check.js   (exit 0 = pass)
 */
const CB = require('../lib/chatbotBuilder');

const TID = '__check_chatbot__' + Date.now().toString(36);
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; console.error('  FAIL: ' + msg); } else { console.log('  ok: ' + msg); } };

(async () => {
  console.log('=== chatbot-builder-check (tenant ' + TID + ') ===');

  const doc = CB.doctor.run();
  assert(doc.checks.find((c) => c.name === 'example flow valid' && c.ok), 'example flow validates');

  const seed = CB.seedExample(TID);
  assert(seed.seeded, 'example flow seeded');

  const sim = (text) => CB.handleMessage(TID, { phone: '+923001234567', name: 'Basit', text }, { forceDryRun: true });

  let r = await sim('hi');
  assert(r.matched && r.dryRun && !r.sent, 'greeting matched, dry-run, not sent');
  assert(r.replies.join(' ').toLowerCase().includes('naam') || r.awaiting, 'asks for name / awaits input');

  r = await sim('Basit');
  assert(r.awaiting, 'after name -> awaiting choice');
  assert(r.replies.join('\n').includes('1.'), 'choice options rendered');

  r = await sim('1');
  assert(r.replies.length > 0, 'pricing branch produced a reply');

  r = await sim('Haan');
  assert(r.status === 'handoff', 'demo=yes routes to human handoff');

  // cleanup
  try { require('fs').rmSync(require('path').join(__dirname, '..', 'data', 'chatbot_builder', TID + '_flows.json'), { force: true }); } catch {}
  try { require('fs').rmSync(require('path').join(__dirname, '..', 'data', 'chatbot_builder', TID + '_sessions.json'), { force: true }); } catch {}

  console.log('=== ' + (failures ? 'FAILED (' + failures + ')' : 'PASSED') + ' ===');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('check crashed:', e); process.exit(1); });
