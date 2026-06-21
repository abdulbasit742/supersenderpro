 'use strict';
 /**
  * tests/smoke/marketingJourneysSmoke.js — module-level smoke. No server, no
  * network, no live send. Verifies safe defaults, drafts, consent, and masking.
  */
 const path = require('path');
 const assert = require('assert');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));


 function main() {
   const results = [];
   const ok = (name, fn) => { try { fn(); results.push({ name, status: 'pass' }); } catch (e) { results.push({ name,
 status: 'fail', error: e.message }); } };


   const service = R('lib/marketingJourneys/journeyService.js');
   const model = R('lib/marketingJourneys/journeyModel.js');
   const emailTemplates = R('lib/marketingJourneys/emailTemplates.js');
   const smsTemplates = R('lib/marketingJourneys/smsTemplates.js');
   const segmentPreview = R('lib/marketingJourneys/segmentPreview.js');
   const previewRunner = R('lib/marketingJourneys/journeyPreviewRunner.js');
   R('routes/marketingJourneysRoutes.js');

   ok('8 default journeys seeded', () => assert.strictEqual(service.list().length, 8));
   ok('journey model forces dryRun true', () => { const j = model.newJourney({ name: 'X', dryRun: false });
 assert.strictEqual(j.dryRun, true); });
   ok('email template includes unsubscribe', () => { const r = emailTemplates.render('welcome_email', {});
 assert.ok(/unsub/i.test(r.bodyPreview)); assert.strictEqual(r.unsubscribeIncluded, true); });
   ok('sms template includes STOP opt-out', () => { const r = smsTemplates.render('welcome_sms', {});
 assert.ok(/STOP/.test(r.messagePreview)); assert.strictEqual(r.optOutIncluded, true); });
   ok('segment preview masks email + phone', () => { const p = segmentPreview.preview('all_customers', 3);
 p.sample.forEach((s) => { assert.ok(/\*\*\*/.test(s.recipientEmailMasked));
 assert.ok(/\*\*\*/.test(s.recipientPhoneMasked)); }); });
   ok('preview-run is dry-run, no live actions', () => { const run = previewRunner.run(service.get('welcome_series'));
 assert.strictEqual(run.dryRun, true); assert.strictEqual(run.liveActionsEnabled, false); });
   ok('preview-run produces email + sms drafts with liveSend false', () => { const run =
 previewRunner.run(service.get('welcome_series')); run.emailDrafts.concat(run.smsDrafts).forEach((d) =>
 assert.strictEqual(d.liveSend, false)); });

     ok('no raw email/phone leaks in drafts', () => { const run = previewRunner.run(service.get('abandoned_cart')); const
 blob = JSON.stringify(run); assert.ok(!/customer0@example\.com/.test(blob)); assert.ok(!/\+923000000010/.test(blob)); });

     const passed = results.filter((r) => r.status === 'pass').length;
     const failed = results.filter((r) => r.status === 'fail').length;
     console.log('[marketing-journeys:smoke] passed=%d failed=%d', passed, failed);
     results.filter((r) => r.status === 'fail').forEach((r) => console.log(' FAIL', r.name, '-', r.error));
     process.exit(failed === 0 ? 0 : 1);
 }
 main();
