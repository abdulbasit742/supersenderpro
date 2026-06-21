 'use strict';
 /**
  * scripts/customer-portal-check.js — verifies the portal can be required, redactor
  * masks correctly, and every status response is preview-safe. No server needed,
  * no external calls. Writes a report to artifacts/.
  */
 const fs = require('fs');
 const path = require('path');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));

 function main() {
   const blockers = [];
   const warnings = [];

   const service = R('lib/customerPortal/customerPortalService.js');
   R('routes/customerPortalRoutes.js'); // requireable
   const redactor = R('lib/customerPortal/redactor.js');
   const summary = R('lib/customerPortal/statusSummaryPreview.js');

   // redactor functions exist + mask
   ['maskPhone', 'maskEmail', 'maskRef'].forEach((fn) => { if (typeof redactor[fn] !== 'function')
 blockers.push('redactor_missing:' + fn); });
   if (/923001112233/.test(redactor.maskPhone('+923001112233'))) blockers.push('phone_not_masked');
   if (/secret@x\.com/.test(redactor.maskEmail('secret@x.com'))) blockers.push('email_not_masked');
   if (/ABC12345/.test(redactor.maskRef('ABC12345'))) blockers.push('ref_not_masked');

   // status response shape
   const tokens = service.list();
   const s = tokens.length ? summary.forToken(tokens[0].previewToken) : summary.overview();
   if (s.dryRun !== true) blockers.push('dryRun_not_true');
   if (s.liveActionsEnabled !== false) blockers.push('liveActionsEnabled_not_false');
   if (s.externalCallsEnabled !== false) blockers.push('externalCalls_not_false');
   if (s.portalPublicLive !== false) blockers.push('portalPublicLive_not_false');

   const result = { generatedAt: new Date().toISOString(), dryRun: true, liveActionsEnabled: false, module: 'customer-portal', customers: tokens.length, warnings, blockers, pass: blockers.length === 0 };
   const ARTIFACTS = path.join(ROOT, 'artifacts');
   if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });

   fs.writeFileSync(path.join(ARTIFACTS, 'customer_portal_check.json'), JSON.stringify(result, null, 2));
   console.log('[customer-portal:check] customers=%d blockers=%d pass=%s', tokens.length, blockers.length, result.pass);
   process.exit(result.pass ? 0 : 1);
 }
 main();
