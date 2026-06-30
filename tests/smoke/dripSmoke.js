// tests/smoke/dripSmoke.js
// Offline smoke test for the drip sequencer. No model: authorSteps uses
// templates. Define -> enroll -> due -> advance -> complete is exercised with a
// zero-delay sequence so steps come due immediately. Exit code 0 = pass.
//
// Run: node tests/smoke/dripSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template steps

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const drip = require('../../lib/drip/dripSequencer');
const { templateSteps, fill } = drip._internal;

function clear(storeId) {
  for (const s of ['_sequences.json', '_enrollments.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'drip', `${storeId}${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'drip_smoke';
  clear(STORE);

  // merge-field fill
  assert.strictEqual(fill('Hi {{name}}!', { name: 'Ali' }), 'Hi Ali!'); passed++;
  assert.strictEqual(fill('Hi {{name}}!', {}), 'Hi there!'); passed++;

  // template author shape
  const ts = templateSteps('welcome new users', 3);
  assert.strictEqual(ts.length, 3); assert.ok(ts.every(s => s.text.includes('{{name}}'))); passed++;

  // authorSteps falls back to template offline
  const authored = await drip.authorSteps({ goal: 'welcome new signups', stepCount: 3 });
  assert.strictEqual(authored.source, 'fallback'); assert.strictEqual(authored.steps.length, 3); passed++;

  // define a zero-delay 2-step sequence so it\'s due immediately
  const seq = drip.defineSequence({ storeId: STORE, id: 'welcome', name: 'Welcome', trigger: 'signup', steps: [ { delayHours: 0, text: 'Hi {{name}}, welcome!' }, { delayHours: 0, text: 'Quick tip for you, {{name}}. Reply STOP to opt out.' } ] });
  assert.strictEqual(seq.steps.length, 2); passed++;
  assert.ok(drip.listSequences({ storeId: STORE }).length >= 1); passed++;

  // enroll a contact
  const en = drip.enroll({ storeId: STORE, phone: '+92300', sequenceId: 'welcome' });
  assert.strictEqual(en.ok, true); passed++;
  // double-enroll blocked
  assert.strictEqual(drip.enroll({ storeId: STORE, phone: '+92300', sequenceId: 'welcome' }).ok, false); passed++;

  // step 0 is due now (delay 0)
  let dueNow = drip.due({ storeId: STORE, nameByPhone: { '+92300': 'Ayesha' } });
  assert.strictEqual(dueNow.length, 1); assert.strictEqual(dueNow[0].step, 0); passed++;
  assert.ok(/Ayesha/.test(dueNow[0].text), 'name should be filled'); passed++;

  // mark sent -> advances to step 1 (also due, delay 0)
  const adv = drip.markStepSent({ storeId: STORE, phone: '+92300', sequenceId: 'welcome' });
  assert.strictEqual(adv.status, 'active'); assert.strictEqual(adv.step, 1); passed++;
  dueNow = drip.due({ storeId: STORE });
  assert.strictEqual(dueNow.length, 1); assert.strictEqual(dueNow[0].step, 1); passed++;

  // mark last step sent -> completes
  const done = drip.markStepSent({ storeId: STORE, phone: '+92300', sequenceId: 'welcome' });
  assert.strictEqual(done.status, 'completed'); passed++;
  assert.strictEqual(drip.due({ storeId: STORE }).length, 0, 'completed sequence has nothing due'); passed++;

  // onEvent enrolls into matching-trigger sequences
  const ev = drip.onEvent({ storeId: STORE, phone: '+92301', event: 'signup' });
  assert.ok(ev.enrolled.includes('welcome')); passed++;
  // stop halts it
  assert.strictEqual(drip.stop({ storeId: STORE, phone: '+92301' }).stopped, 1); passed++;
  assert.strictEqual(drip.due({ storeId: STORE }).filter(d => d.phone === '+92301').length, 0); passed++;

  // future-delay step is NOT due yet
  drip.defineSequence({ storeId: STORE, id: 'later', trigger: 'manual', steps: [ { delayHours: 48, text: 'see you in 2 days {{name}}' } ] });
  drip.enroll({ storeId: STORE, phone: '+92302', sequenceId: 'later' });
  assert.strictEqual(drip.due({ storeId: STORE }).filter(d => d.phone === '+92302').length, 0, 'future step not due'); passed++;

  // bad define throws
  let threw = false; try { drip.defineSequence({ storeId: STORE, id: 'x', steps: [] }); } catch { threw = true; }
  assert.ok(threw, 'define with no steps should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 drip smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c drip smoke failed:', e); process.exit(1); });
