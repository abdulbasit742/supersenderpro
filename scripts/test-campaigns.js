'use strict';

/**
 * scripts/test-campaigns.js
 * Self-contained smoke test for the campaign scheduler feature.
 * Runs fully offline in dry-run mode (no WhatsApp, no network).
 *
 *   node scripts/test-campaigns.js
 *
 * Exit code 0 = pass, 1 = fail. Wired into npm via "test:campaigns".
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

// Isolate the store in a temp dir so the test never touches real data.
process.env.CAMPAIGN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ssp-camp-'));

const store = require('../lib/campaignStore');
const { CampaignScheduler } = require('../lib/campaignScheduler');

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.error('  ✗ ' + msg); failures++; }
}

(async () => {
  console.log('Campaign scheduler smoke test');

  // 1. create
  const c = store.createCampaign({
    name: 'Test blast',
    message: 'Hi {name}, this is a test to {to}',
    recipients: ['923001234567,Ali', { to: '923119876543', name: 'Sara' }, ',MissingNumber'],
    throttleMs: 0,
    dailyCap: 0,
  });
  assert(c.id && c.id.startsWith('camp_'), 'campaign created with id');
  assert(c.recipients.length === 2, 'invalid recipients filtered (2 valid)');
  assert(c.log.length === 2, 'log seeded per recipient');
  assert(c.status === 'draft', 'no scheduleAt => draft');

  // 2. run in dry-run mode
  const scheduler = new CampaignScheduler({ dryRun: true, logger: () => {} });
  const result = await scheduler.runCampaign(c.id);
  assert(result.ok === true, 'runCampaign returned ok');

  const after = store.getCampaign(c.id);
  assert(after.status === 'completed', 'campaign completed after run');
  assert(after.log.every((l) => l.status === 'sent'), 'all recipients marked sent');
  assert(after.startedAt && after.completedAt, 'timestamps recorded');

  // 3. analytics
  const a = store.campaignAnalytics(c.id);
  assert(a.total === 2 && a.counts.sent === 2, 'analytics counts correct');
  assert(a.deliveryRate === 100, 'delivery rate 100%');

  // 4. message rendering
  const rendered = scheduler.render('Hi {name} at {to}', { name: 'Ali', to: '92300' });
  assert(rendered === 'Hi Ali at 92300', 'placeholders rendered');

  // 5. summary
  const summary = store.summaryAnalytics();
  assert(summary.campaigns === 1 && summary.sent === 2, 'summary aggregates');

  // 6. pause/resume + delete
  store.updateCampaign(c.id, { status: 'sending' });
  assert(scheduler.pauseCampaign(c.id).status === 'paused', 'pause works');
  assert(store.deleteCampaign(c.id) === true, 'delete works');
  assert(store.getCampaign(c.id) === null, 'campaign removed');

  scheduler.stop();

  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
