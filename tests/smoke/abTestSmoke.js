// tests/smoke/abTestSmoke.js
// Offline smoke test for the A/B testing engine. No model: verdict uses the
// deterministic message. Focus: stable assignment, even-ish split, the z-test
// significance gate, and winner declaration. Exit code 0 = pass.
//
// Run: node tests/smoke/abTestSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> deterministic verdict

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ab = require('../../lib/abTest/abTest');
const { assignIndex, twoPropConfidence } = ab._internal;

function clear(storeId) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'ab_test', `${storeId}_experiments.json`)); } catch {} }

(async () => {
  let passed = 0;
  const STORE = 'ab_smoke';
  clear(STORE);

  // stable assignment: same contact -> same index every time
  const i1 = assignIndex('exp1', '+92300', 2);
  const i2 = assignIndex('exp1', '+92300', 2);
  assert.strictEqual(i1, i2); passed++;
  assert.ok(i1 === 0 || i1 === 1); passed++;

  // even-ish split across many contacts
  let a = 0, b = 0;
  for (let i = 0; i < 2000; i++) { (assignIndex('exp1', '+9230' + i, 2) === 0 ? a++ : b++); }
  assert.ok(Math.abs(a - b) < 200, `split should be ~even, got ${a}/${b}`); passed++;

  // z-test: clearly different proportions -> high confidence
  const hi = twoPropConfidence(120, 1000, 60, 1000); // 12% vs 6%
  assert.ok(hi > 0.95, `expected high confidence, got ${hi}`); passed++;
  // nearly equal -> low confidence
  const lo = twoPropConfidence(101, 1000, 100, 1000);
  assert.ok(lo < 0.5, `expected low confidence, got ${lo}`); passed++;

  // create experiment
  const c = ab.create({ storeId: STORE, id: 'subjectline', name: 'Subject line', variants: [{ label: 'A: short' }, { label: 'B: emoji' }], minSamplePerVariant: 100 });
  assert.strictEqual(c.ok, true); assert.strictEqual(c.experiment.variants.length, 2); passed++;
  // duplicate create blocked
  assert.strictEqual(ab.create({ storeId: STORE, id: 'subjectline', variants: [{ label: 'x' }, { label: 'y' }] }).ok, false); passed++;

  // assign is stable + returns a known variant id
  const asg = ab.assign({ storeId: STORE, id: 'subjectline', contact: '+92301' });
  assert.ok(asg.ok && (asg.variantId === 'A' || asg.variantId === 'B')); passed++;
  assert.strictEqual(ab.assign({ storeId: STORE, id: 'subjectline', contact: '+92301' }).variantId, asg.variantId); passed++;

  // record data: A 12% (120/1000), B 6% (60/1000)
  ab.recordImpression({ storeId: STORE, id: 'subjectline', variantId: 'A', count: 1000 });
  ab.recordConversion({ storeId: STORE, id: 'subjectline', variantId: 'A', count: 120 });
  ab.recordImpression({ storeId: STORE, id: 'subjectline', variantId: 'B', count: 1000 });
  ab.recordConversion({ storeId: STORE, id: 'subjectline', variantId: 'B', count: 60 });

  // results: A leads, significant, can declare
  const r = ab.results({ storeId: STORE, id: 'subjectline' });
  assert.strictEqual(r.leader, 'A'); passed++;
  assert.ok(r.confidence > 0.95); passed++;
  assert.strictEqual(r.minSampleMet, true); passed++;
  assert.strictEqual(r.canDeclareWinner, true); passed++;
  assert.ok(r.lift > 0); passed++;

  // verdict (fallback) message present
  const v = await ab.verdict({ storeId: STORE, id: 'subjectline' });
  assert.ok(v.message && v.message.length); passed++;

  // conclude auto-declares the leader
  const con = ab.conclude({ storeId: STORE, id: 'subjectline' });
  assert.strictEqual(con.ok, true); assert.strictEqual(con.winner, 'A'); passed++;

  // an underpowered experiment cannot auto-conclude
  ab.create({ storeId: STORE, id: 'tiny', variants: [{ label: 'A' }, { label: 'B' }], minSamplePerVariant: 100 });
  ab.recordImpression({ storeId: STORE, id: 'tiny', variantId: 'A', count: 10 });
  ab.recordConversion({ storeId: STORE, id: 'tiny', variantId: 'A', count: 3 });
  ab.recordImpression({ storeId: STORE, id: 'tiny', variantId: 'B', count: 10 });
  const tinyConclude = ab.conclude({ storeId: STORE, id: 'tiny' });
  assert.strictEqual(tinyConclude.ok, false, 'should refuse to declare on tiny sample'); passed++;

  // create requires >=2 variants
  let threw = false; try { ab.create({ storeId: STORE, id: 'bad', variants: [{ label: 'only' }] }); } catch { threw = true; }
  assert.ok(threw, 'create with <2 variants should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 abTest smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c abTest smoke failed:', e); process.exit(1); });
