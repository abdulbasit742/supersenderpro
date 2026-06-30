// tests/smoke/surveysSmoke.js
// Offline smoke test for the survey engine. No model: insights use the
// deterministic summary. Focus: flow (start->answer->complete), validation
// (choice/rating/text), and results rollup (distribution/avg/NPS). Exit 0 = pass.
//
// Run: node tests/smoke/surveysSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> deterministic insight

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const surveys = require('../../lib/surveys/surveyEngine');
const { validate } = surveys._internal;

function clear(storeId) {
  for (const s of ['_surveys.json', '_responses.json', '_sessions.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'surveys', `${storeId}${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'survey_smoke';
  clear(STORE);

  // validation per type
  assert.strictEqual(validate({ type: 'choice', options: ['A', 'B', 'C'] }, '2').value, 'B'); passed++;
  assert.strictEqual(validate({ type: 'choice', options: ['Yes', 'No'] }, 'yes').value, 'Yes'); passed++;
  assert.strictEqual(validate({ type: 'choice', options: ['A', 'B'] }, '9').ok, false); passed++;
  assert.strictEqual(validate({ type: 'rating', min: 1, max: 5 }, '4').value, 4); passed++;
  assert.strictEqual(validate({ type: 'rating', min: 1, max: 5 }, '8').ok, false); passed++;
  assert.strictEqual(validate({ type: 'text' }, 'great service').value, 'great service'); passed++;
  assert.strictEqual(validate({ type: 'text' }, '   ').ok, false); passed++;

  // define a 3-step survey: NPS rating + choice + open text
  surveys.defineSurvey({ storeId: STORE, id: 'csat', name: 'Post-purchase', steps: [
    { type: 'rating', q: 'How likely to recommend us? (0-10)', min: 0, max: 10, nps: true },
    { type: 'choice', q: 'How did you hear about us?', options: ['Friend', 'Instagram', 'Other'] },
    { type: 'text', q: 'Any feedback?' }
  ] });
  assert.strictEqual(surveys.getSurvey({ storeId: STORE, id: 'csat' }).steps.length, 3); passed++;

  // run a full session for one contact
  const s0 = surveys.start({ storeId: STORE, phone: '+92300', surveyId: 'csat' });
  assert.strictEqual(s0.step, 0); assert.ok(/recommend/i.test(s0.question)); passed++;
  // bad rating -> reask
  const bad = surveys.answer({ storeId: STORE, phone: '+92300', surveyId: 'csat', text: '99' });
  assert.strictEqual(bad.reask, true); passed++;
  // good rating 9 (promoter)
  const a1 = surveys.answer({ storeId: STORE, phone: '+92300', surveyId: 'csat', text: '9' });
  assert.strictEqual(a1.step, 1); assert.ok(/hear about/i.test(a1.question)); passed++;
  // choice by number
  const a2 = surveys.answer({ storeId: STORE, phone: '+92300', surveyId: 'csat', text: '2' });
  assert.strictEqual(a2.step, 2); passed++;
  // text -> completes
  const a3 = surveys.answer({ storeId: STORE, phone: '+92300', surveyId: 'csat', text: 'loved it!' });
  assert.strictEqual(a3.done, true); passed++;

  // a second respondent (detractor 3, Friend, feedback)
  surveys.start({ storeId: STORE, phone: '+92301', surveyId: 'csat' });
  surveys.answer({ storeId: STORE, phone: '+92301', surveyId: 'csat', text: '3' });
  surveys.answer({ storeId: STORE, phone: '+92301', surveyId: 'csat', text: '1' });
  surveys.answer({ storeId: STORE, phone: '+92301', surveyId: 'csat', text: 'shipping slow' });

  // results rollup
  const r = surveys.results({ storeId: STORE, surveyId: 'csat' });
  assert.strictEqual(r.totalResponses, 2); passed++;
  const ratingQ = r.perQuestion[0];
  assert.strictEqual(ratingQ.type, 'rating'); assert.strictEqual(ratingQ.avg, 6); passed++; // (9+3)/2
  assert.strictEqual(ratingQ.nps, 0, 'NPS: 1 promoter(9) - 1 detractor(3) over 2 = 0'); passed++;
  const choiceQ = r.perQuestion[1];
  assert.strictEqual(choiceQ.distribution['Instagram'], 1); assert.strictEqual(choiceQ.distribution['Friend'], 1); passed++;
  const textQ = r.perQuestion[2];
  assert.ok(textQ.samples.includes('loved it!') && textQ.samples.includes('shipping slow')); passed++;

  // insights (fallback) produces a summary string
  const ins = await surveys.insights({ storeId: STORE, surveyId: 'csat' });
  assert.ok(ins.insight && ins.insight.length); assert.strictEqual(ins.source, 'fallback'); passed++;

  // bad define throws
  let threw = false; try { surveys.defineSurvey({ storeId: STORE, id: 'x', steps: [] }); } catch { threw = true; }
  assert.ok(threw, 'define with no steps should throw'); passed++;

  // answering with no active session fails cleanly
  assert.strictEqual(surveys.answer({ storeId: STORE, phone: '+92999', surveyId: 'csat', text: 'hi' }).ok, false); passed++;

  clear(STORE);
  console.log(`\u2705 surveys smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c surveys smoke failed:', e); process.exit(1); });
