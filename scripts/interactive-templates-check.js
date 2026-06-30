'use strict';
/**
 * scripts/interactive-templates-check.js - smoke test for the Interactive Templates module.
 * Validates the example templates, stores one of each, builds payloads with {{var}} ctx,
 * and asserts the WhatsApp interactive payload shape + spec-limit clipping. No sends.
 * Usage: node scripts/interactive-templates-check.js   (exit 0 = pass)
 */
const IT = require('../lib/interactiveTemplates');

const TID = '__check_itpl__' + Date.now().toString(36);
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; console.error('  FAIL: ' + msg); } else { console.log('  ok: ' + msg); } };

(async () => {
  console.log('=== interactive-templates-check (tenant ' + TID + ') ===');
  const ex = IT.examples();

  Object.keys(ex).forEach((k) => assert(IT.validate(ex[k]).ok, 'example "' + k + '" validates'));

  const btns = IT.templates.create(TID, ex.buttons);
  const r1 = await IT.send(TID, btns.id, '+923001234567', { name: 'Basit' });
  assert(r1.dryRun && !r1.sent, 'buttons send is dry-run, not sent');
  assert(r1.payload.interactive.type === 'button', 'buttons -> interactive.type=button');
  assert(r1.payload.interactive.action.buttons.length <= 3, 'max 3 reply buttons');
  assert(r1.payload.interactive.body.text.includes('Basit'), '{{name}} interpolated in body');
  assert(r1.payload.interactive.action.buttons.every((b) => b.reply.title.length <= 20), 'button titles clipped to 20');

  const lst = IT.templates.create(TID, ex.list);
  const r2 = await IT.send(TID, lst.id, '+923001234567', { name: 'Basit' });
  assert(r2.payload.interactive.type === 'list', 'list -> interactive.type=list');
  assert(Array.isArray(r2.payload.interactive.action.sections) && r2.payload.interactive.action.sections.length >= 1, 'list has sections');

  const cta = IT.templates.create(TID, ex.cta_url);
  const r3 = await IT.send(TID, cta.id, '+923001234567', { name: 'Basit' });
  assert(r3.payload.interactive.type === 'cta_url', 'cta -> interactive.type=cta_url');
  assert(r3.payload.interactive.action.parameters.url === 'https://example.com/shop', 'cta url preserved');

  let threw = false; try { IT.templates.create(TID, { name: 'bad', type: 'buttons', bodyText: 'x', buttons: [1,2,3,4].map((i) => ({ title: 'b' + i })) }); } catch { threw = true; }
  assert(threw, '>3 buttons rejected by validation');

  const doc = IT.doctor.run();
  assert(doc.checks.find((c) => c.name === 'example templates valid' && c.ok), 'doctor: examples valid');

  try { require('fs').rmSync(require('path').join(__dirname, '..', 'data', 'interactive_templates', TID + '_templates.json'), { force: true }); } catch {}

  console.log('=== ' + (failures ? 'FAILED (' + failures + ')' : 'PASSED') + ' ===');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('check crashed:', e); process.exit(1); });
