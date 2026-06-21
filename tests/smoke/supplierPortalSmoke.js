 'use strict';
 /**
  * tests/smoke/supplierPortalSmoke.js — module-level smoke. No server, no network,
  * no sends. Verifies status, lookup, summary, quote/payment/support/message/doc
  * previews stay non-live, and no full PII (phone/email/bank/tax) leaks.
  */
 const path = require('path');
 const assert = require('assert');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));


 function main() {
   const results = [];
   const ok = (name, fn) => { try { fn(); results.push({ name, status: 'pass' }); } catch (e) { results.push({ name,
 status: 'fail', error: e.message }); } };

   const service = R('lib/supplierPortal/supplierPortalService.js');
   const summary = R('lib/supplierPortal/statusSummaryPreview.js');
   const quote = R('lib/supplierPortal/quoteStatusPreview.js');
   const billPay = R('lib/supplierPortal/billPaymentStatusPreview.js');
   const support = R('lib/supplierPortal/supportRequestPreview.js');
   const messageDrafts = R('lib/supplierPortal/messageDrafts.js');
   const documentRequestPreview = R('lib/supplierPortal/documentRequestPreview.js');
   R('routes/supplierPortalRoutes.js');


   const token = service.list()[0].previewToken;

   ok('getSupplierPortalStatus / overview + dryRun', () => { const o = summary.overview(); assert.strictEqual(o.dryRun,
 true); assert.strictEqual(o.supplierPortalPublicLive, false); });
   ok('lookupSupplierPreview works', () => { const s = service.getByToken(token); assert.ok(s && s.previewToken ===
 token); });
   ok('getSupplierSummaryPreview works', () => { const r = summary.forToken(token); assert.strictEqual(r.ok, true);
 assert.ok(r.summaryPreview && r.summaryPreview.statuses); });
   ok('quote preview returns liveQuoteMutation false', () => { const r = quote.forToken(token);
 assert.strictEqual(r.detailPreview.liveQuoteMutation, false); assert.strictEqual(r.previewOnly, true); });
   ok('payment preview returns livePaymentAction false', () => { const r = billPay.forToken(token);
 assert.strictEqual(r.detailPreview.livePaymentAction, false); });
   ok('support request returns liveTicketCreation false', () => { const r = support.preview(token, { subject: 'x' });
 assert.strictEqual(r.liveTicketCreation, false); });
   ok('message draft returns liveSend false', () => { const r = messageDrafts.draft(token, { text: 'hi' });
 assert.strictEqual(r.liveSend, false); });
   ok('document request returns liveDocumentDownload false', () => { const r = documentRequestPreview.forToken(token);
 assert.strictEqual(r.detailPreview.liveDocumentDownload, false); });
   ok('no full phone/email/bank/tax leak', () => { const blob = JSON.stringify([summary.forToken(token),
 support.preview(token, {}), messageDrafts.draft(token, {})]); assert.ok(!/\+923001112233/.test(blob));
 assert.ok(!/sales@cloudvendora\.com/.test(blob)); assert.ok(!/0000001123456702/.test(blob));
 assert.ok(!/NTN1234567/.test(blob)); });
   ok('missing supplier fallback does not crash', () => { const r = summary.forToken('sup_nope'); assert.strictEqual(r.ok,

 false); assert.ok(r.blockers.includes('supplier_not_found')); });


     const passed = results.filter((r) => r.status === 'pass').length;
     const failed = results.filter((r) => r.status === 'fail').length;
     console.log('[supplier-portal:smoke] passed=%d failed=%d', passed, failed);
     results.filter((r) => r.status === 'fail').forEach((r) => console.log('   FAIL', r.name, '-', r.error));
     process.exit(failed === 0 ? 0 : 1);
 }
 main();
