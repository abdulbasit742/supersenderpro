'use strict';
/**
 * Offline smoke test for the Survey/NPS engine (#145).
 * Forces an unreachable Ollama host so it passes with NO model running.
 * Run directly: node tests/smoke/surveySmoke.js
 * Auto-discovered by scripts/ci-smoke.js
 */
process.env.OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:0';
process.env.LLM_HUB_DRY_RUN = 'true';

const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

// isolate data dir so the test never touches real tenant data
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'survey-smoke-'));
process.chdir(tmp);

const survey = require(path.join(__dirname, '..', '..', 'lib', 'surveyEngine'));

(async () => {
  const T = 'tenant_test';

  // tenantId required
  assert.throws(() => survey.listSurveys(), /tenantId/, 'missing tenant should throw');

  // create NPS survey
  const s = survey.createSurvey(T, { name: 'Post-purchase NPS', template: 'nps', audience: ['+923001234567', '+923009876543'] });
  assert.ok(s.id, 'survey created');
  assert.strictEqual(s.type, 'nps');

  // schedule is dry-run by default and masks phones
  const plan = survey.scheduleSurvey(T, s.id, {});
  assert.strictEqual(plan.dryRun, true, 'schedule dry-run by default');
  assert.strictEqual(plan.count, 2);
  assert.ok(/\*\*\*\*/.test(plan.plan[0].to), 'phone masked in plan');

  // record responses -> NPS math
  survey.recordResponse(T, s.id, { phone: '+923001234567', score: 10, comment: 'delivery fast, achha product' });
  survey.recordResponse(T, s.id, { phone: '+923009876543', score: 6, comment: 'price mehnga laga' });
  survey.recordResponse(T, s.id, { phone: '+923001112223', score: 8, comment: '' });
  const sc = survey.score(T, s.id);
  // 1 promoter, 1 passive, 1 detractor over 3 => (1-1)/3*100 = 0
  assert.strictEqual(sc.responses, 3);
  assert.strictEqual(sc.score, 0, 'nps math');
  assert.strictEqual(sc.buckets.promoter, 1);
  assert.strictEqual(sc.buckets.detractor, 1);

  // out-of-range score rejected
  assert.throws(() => survey.recordResponse(T, s.id, { phone: 'x', score: 99 }), /0-10/);

  // verbatim theming falls back to template with no model
  const themes = await survey.summarizeVerbatims(T, s.id);
  assert.ok(Array.isArray(themes.themes), 'themes array');
  assert.ok(themes.themes.find(t => t.theme === 'delivery'), 'delivery theme detected');
  assert.notStrictEqual(themes.method, 'ollama', 'no model => template fallback');

  // CSAT survey average + top-box
  const c = survey.createSurvey(T, { name: 'Support CSAT', template: 'csat' });
  survey.recordResponse(T, c.id, { phone: '+9230011', score: 5 });
  survey.recordResponse(T, c.id, { phone: '+9230022', score: 4 });
  survey.recordResponse(T, c.id, { phone: '+9230033', score: 2 });
  const csat = survey.score(T, c.id);
  assert.strictEqual(csat.score, 3.67, 'csat avg');
  assert.strictEqual(csat.topBoxPct, 67, 'csat top-box %');

  console.log('survey smoke: OK');
})().catch((e) => { console.error('survey smoke FAILED:', e.message); process.exit(1); });
