 'use strict';
 /**
  * scripts/marketing-journeys-check.js — loads the marketing-journeys layer,
  * confirms safe defaults (dry-run, no live send), counts journeys/templates,
  * verifies every email draft includes unsubscribe and every SMS includes opt-out.
  * Read-only; writes a small report to artifacts/. No network, no secrets.
  */
 const fs = require('fs');
 const path = require('path');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));

 function main() {
   const service = R('lib/marketingJourneys/journeyService.js');
   const emailTemplates = R('lib/marketingJourneys/emailTemplates.js');
   const smsTemplates = R('lib/marketingJourneys/smsTemplates.js');
   const previewRunner = R('lib/marketingJourneys/journeyPreviewRunner.js');
   R('routes/marketingJourneysRoutes.js');


   const journeys = service.list();
   const blockers = [];
   const warnings = [];

   // Every email template must carry an unsubscribe footer.
   emailTemplates.list().forEach((t) => { const r = emailTemplates.render(t.id, {}); if (!r.unsubscribeIncluded ||
 !/unsub/i.test(r.bodyPreview)) blockers.push('email_no_unsub:' + t.id); });
   // Every SMS template must carry an opt-out line.
   smsTemplates.list().forEach((t) => { const r = smsTemplates.render(t.id, {}); if (!r.optOutIncluded ||
 !/STOP/.test(r.messagePreview)) blockers.push('sms_no_optout:' + t.id); });
   // Every journey preview must be dry-run with live actions off.
   journeys.forEach((j) => { const run = previewRunner.run(service.get(j.id)); if (run.dryRun !== true ||
 run.liveActionsEnabled !== false) blockers.push('journey_not_dry_run:' + j.id); });

   const result = {
     generatedAt: new Date().toISOString(),
     dryRun: true, liveActionsEnabled: false,
     module: 'marketing-journeys',
     journeys: journeys.length,
     emailTemplates: emailTemplates.list().length,
     smsTemplates: smsTemplates.list().length,

     warnings, blockers,
     pass: blockers.length === 0,
   };


   const ARTIFACTS = path.join(ROOT, 'artifacts');
   if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
   fs.writeFileSync(path.join(ARTIFACTS, 'marketing_journeys_check.json'), JSON.stringify(result, null, 2));

   console.log('[marketing-journeys:check] journeys=%d email=%d sms=%d blockers=%d pass=%s', result.journeys,
 result.emailTemplates, result.smsTemplates, result.blockers.length, result.pass);
   process.exit(result.pass ? 0 : 1);
 }
 main();
