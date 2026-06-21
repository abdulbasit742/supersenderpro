 'use strict';
 /**
  * tests/smoke/customerPortalSmoke.js — module-level smoke. No server, no network,
  * no sends. Verifies portal status, lookup, summary, support/message/document
  * previews stay non-live, and no full PII leaks.
  */
 const path = require('path');
 const assert = require('assert');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));

 function main() {
   const results = [];
   const ok = (name, fn) => { try { fn(); results.push({ name, status: 'pass' }); } catch (e) { results.push({ name,
 status: 'fail', error: e.message }); } };


   const service = R('lib/customerPortal/customerPortalService.js');
   const summary = R('lib/customerPortal/statusSummaryPreview.js');
   const support = R('lib/customerPortal/supportRequestPreview.js');
   const messageDrafts = R('lib/customerPortal/messageDrafts.js');
   const documentRequestPreview = R('lib/customerPortal/documentRequestPreview.js');
   const invoiceStatusPreview = R('lib/customerPortal/invoiceStatusPreview.js');
   R('routes/customerPortalRoutes.js');

   const token = service.list()[0].previewToken;


   ok('getPortalStatus / overview works + dryRun', () => { const o = summary.overview(); assert.strictEqual(o.dryRun,
 true); assert.strictEqual(o.portalPublicLive, false); });
   ok('lookupCustomerPreview works', () => { const c = service.getByToken(token); assert.ok(c && c.previewToken ===
 token); });
   ok('getCustomerSummaryPreview works', () => { const r = summary.forToken(token); assert.strictEqual(r.ok, true);
 assert.ok(r.summaryPreview && r.summaryPreview.statuses); });
   ok('invoice preview livePayment false', () => { const r = invoiceStatusPreview.forToken(token);
 assert.strictEqual(r.previewOnly, true); assert.strictEqual(r.liveAction, false); });
   ok('support request returns liveTicketCreation false', () => { const r = support.preview(token, { subject: 'help',
 body: 'x' }); assert.strictEqual(r.liveTicketCreation, false); assert.strictEqual(r.previewOnly, true); });
   ok('message draft returns liveSend false', () => { const r = messageDrafts.draft(token, { text: 'hi' });
 assert.strictEqual(r.liveSend, false); });
   ok('document request returns liveDocumentDownload false', () => { const r = documentRequestPreview.forToken(token);
 assert.strictEqual(r.detailPreview.liveDocumentDownload, false); });
   ok('no full phone/email leak in responses', () => { const blob = JSON.stringify([summary.forToken(token),
 support.preview(token, {}), messageDrafts.draft(token, {})]); assert.ok(!/\+923001112233/.test(blob));
 assert.ok(!/ayesha@example\.com/.test(blob)); });
   ok('missing customer fallback does not crash', () => { const r = summary.forToken('cust_does_not_exist');
 assert.strictEqual(r.ok, false); assert.ok(r.blockers.includes('customer_not_found')); });

     const passed = results.filter((r) => r.status === 'pass').length;
     const failed = results.filter((r) => r.status === 'fail').length;
     console.log('[customer-portal:smoke] passed=%d failed=%d', passed, failed);
     results.filter((r) => r.status === 'fail').forEach((r) => console.log('   FAIL', r.name, '-', r.error));
     process.exit(failed === 0 ? 0 : 1);
 }
 main();
