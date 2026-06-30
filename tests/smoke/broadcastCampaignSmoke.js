'use strict';

// Offline smoke test. Forces the model host unreachable so we prove the
// deterministic path works with NO model running. Auto-run by scripts/ci-smoke.js.
process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.CAMPAIGN_USE_LLM = 'false';
process.env.CAMPAIGN_DRY_RUN = 'true';

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Isolate data dir so the smoke test never pollutes real tenant data.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-smoke-'));
process.chdir(tmp);

const campaign = require(path.join(__dirname, '..', '..', 'lib', 'broadcastCampaign'));
const audience = require(path.join(__dirname, '..', '..', 'lib', 'broadcastCampaign', 'audience'));
const sendPlan = require(path.join(__dirname, '..', '..', 'lib', 'broadcastCampaign', 'sendPlan'));

(async function run() {
  // 1) tenant isolation
  let threw = false;
  try { await campaign.createCampaign('', {}); } catch (e) { threw = true; }
  assert.ok(threw, 'missing tenantId must throw');

  // 2) audience targeting is deterministic
  const contacts = [
    { id: 'a', tags: ['vip'], city: 'Karachi', orderCount: 5, optedIn: true },
    { id: 'b', tags: ['lead'], city: 'Lahore', orderCount: 0, optedIn: true },
    { id: 'c', tags: ['vip'], city: 'Karachi', orderCount: 2, optedIn: false },
  ];
  const aud = audience.target(contacts, { anyTags: ['vip'], optedInOnly: true });
  assert.strictEqual(aud.selected, 1, 'only opted-in vip should match');

  // 3) compose falls back to templates with no model, returns requested variants
  const res = await campaign.createCampaign('tenantX', {
    name: 'Eid Sale',
    brief: { message: 'Eid Sale: 30% off {{name}}!' },
    variants: 3,
    context: { name: 'Ali' },
    contacts,
    audienceRule: { anyTags: ['vip'] },
  });
  assert.strictEqual(res.campaign.variants.length, 3, 'should produce 3 variants');
  assert.ok(res.campaign.variants.every((v) => v.source === 'template'), 'all template source offline');
  assert.ok(res.campaign.variants[0].text.includes('Ali'), 'template var fill works');

  // 4) send plan is dry-run, throttled, quiet-hours aware
  const plan = campaign.planSend('tenantX', res.campaign.id, {
    contacts,
    ratePerMinute: 10,
    batchSize: 2,
    startAt: '2026-07-01T23:30:00+05:00', // inside quiet hours -> must shift
  });
  assert.strictEqual(plan.dryRun, true, 'must default to dry-run');
  assert.ok(plan.plan.batches.length >= 1, 'should produce batches');
  const firstHour = new Date(plan.plan.startAt).getHours();
  assert.ok(!sendPlan.inQuietHours(firstHour), 'start must be shifted out of quiet hours');

  // 5) doctor passes
  const doctor = require(path.join(__dirname, '..', '..', 'lib', 'broadcastCampaign', 'doctor'));
  assert.ok(doctor.check().ok, 'doctor should be healthy');

  console.log('broadcastCampaignSmoke: OK');
})().catch((e) => { console.error('broadcastCampaignSmoke FAILED:', e.message); process.exit(1); });
