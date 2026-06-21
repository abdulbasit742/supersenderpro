#!/usr/bin/env node
// scripts/vendor-portal-check.js — Validates Vendor Portal install + safe behaviour. No server, no external calls.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (r) => fs.existsSync(path.join(ROOT, r));

const LIB = [
  'store.js', 'vendorPortalModel.js', 'vendorPortalService.js', 'statusSummaryPreview.js',
  'vendorProfilePreview.js', 'tierStatusPreview.js', 'accountStatusPreview.js', 'supplyCatalogPreview.js',
  'purchasePriceListPreview.js', 'purchaseOrderStatusPreview.js', 'grnStatusPreview.js', 'invoiceSubmissionPreview.js',
  'invoicePaymentStatusPreview.js', 'outstandingPayablePreview.js', 'paymentSchedulePreview.js', 'deliveryStatusPreview.js',
  'qualityInspectionPreview.js', 'complianceDocumentPreview.js', 'contractStatusPreview.js', 'ratingStatusPreview.js',
  'documentRequestPreview.js', 'paymentQueryPreview.js', 'supportRequestPreview.js', 'messageDrafts.js',
  'auditPreview.js', 'redactor.js',
];
LIB.forEach((f) => add(`file lib/vendorPortal/${f}`, exists(`lib/vendorPortal/${f}`)));
['routes/vendorPortalRoutes.js', 'public/vendor-portal.html', 'public/js/vendor-portal.js', 'public/css/vendor-portal.css']
  .forEach((f) => add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('VENDOR PORTAL HOOK'));

let leakBlob = '';
try {
  const svc = require('../lib/vendorPortal/vendorPortalService');
  const red = require('../lib/vendorPortal/redactor');
  require('../routes/vendorPortalRoutes');
  add('route module loads', true);

  const fns = ['getVendorPortalStatus', 'lookupVendorPreview', 'getVendorSummaryPreview', 'getVendorProfilePreview',
    'getTierStatusPreview', 'getAccountStatusPreview', 'getSupplyCatalogPreview', 'getPurchasePriceListPreview',
    'getPurchaseOrderStatusPreview', 'getGrnStatusPreview', 'createInvoiceSubmissionPreview', 'getInvoicePaymentStatusPreview',
    'getOutstandingPayablePreview', 'getPaymentSchedulePreview', 'getQualityInspectionPreview', 'getComplianceDocumentPreview',
    'getContractStatusPreview', 'getRatingStatusPreview', 'createDocumentRequestPreview', 'createPaymentQueryPreview',
    'createSupportRequestPreview', 'createMessageDraftPreview', 'getAuditPreview'];
  add('all service functions exported', fns.every((f) => typeof svc[f] === 'function'), fns.filter((f) => typeof svc[f] !== 'function').join(',') || 'all present');

  const status = svc.getVendorPortalStatus();
  add('status dryRun true + liveActionsEnabled false', status.dryRun === true && status.liveActionsEnabled === false);
  add('status vendorPortalPublicLive false', status.vendorPortalPublicLive === false);
  add('status piiMasked true', status.piiMasked === true);
  add('status externalCallsEnabled false', status.externalCallsEnabled === false);

  add('redactor masks phone', red.maskPhone('+923001234567') === '+92******4567', red.maskPhone('+923001234567'));
  add('redactor masks email', /^de\*+@example\.com$/.test(red.maskEmail('vendor@example.com')) === false && /^ve\*+@example\.com$/.test(red.maskEmail('vendor@example.com')), red.maskEmail('vendor@example.com'));
  add('redactor masks PO ref', red.maskRef('po_1001') === 'po_****');
  add('redactor masks invoice ref', red.maskRef('vinv_3001') === 'vinv_****');
  add('redactor masks payment ref', red.maskPaymentRef('pay_x') === 'pay_****');
  add('redactor masks bank ref', red.maskBankRef('x') === 'bank_****');
  add('redactor masks tax ref', red.maskTaxRef('x') === 'tax_****');
  add('redactor masks document ref', red.maskDocumentRef('x') === 'doc_****');

  const inv = svc.createInvoiceSubmissionPreview({ poId: 'po_1001', items: [{ sku: 'sku_1', qty: 1, unitPrice: 10 }] });
  add('invoice submission liveInvoiceSubmission false', inv.liveInvoiceSubmission === false && inv.livePaymentAction === false);
  const pay = svc.getInvoicePaymentStatusPreview({});
  add('invoice/payment livePaymentAction false', pay.livePaymentAction === false && pay.liveInvoiceMutation === false);
  const po = svc.getPurchaseOrderStatusPreview({});
  add('PO livePOMutation false', po.livePOMutation === false);
  const doc = svc.createDocumentRequestPreview({ documentId: 'doc_7001' });
  add('document request liveDocumentDownload false', doc.liveDocumentDownload === false);
  const msg = svc.createMessageDraftPreview({ message: 'hi' });
  add('message draft liveSend false + masked recipient', msg.liveSend === false && msg.recipientMasked.includes('*'));
  const sum = svc.getVendorSummaryPreview({});
  add('summary piiMasked true + works without modules', sum.piiMasked === true);

  leakBlob = JSON.stringify({ status, inv, pay, po, doc, msg, sum,
    catalog: svc.getSupplyCatalogPreview({}), pos: svc.listPurchaseOrders({}), invoices: svc.listInvoices({}), audit: svc.getAuditPreview() });
  add('no PII/secret leak', !red.hasLeak(leakBlob));
} catch (e) {
  add('functional pipeline', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, strict: String(process.env.VENDOR_PORTAL_STRICT || 'false'), checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'vendor_portal_check.json'), JSON.stringify(out, null, 2));
let md = `# Vendor Portal Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? 'PASS' : 'FAIL'} | ${c.detail.replace(/\|/g, '/')} |\n`; });
fs.writeFileSync(path.join(dir, 'vendor_portal_check.md'), md);
console.log(md);
const strict = String(process.env.VENDOR_PORTAL_STRICT || '').toLowerCase() === 'true';
process.exit((strict && failed > 0) ? 1 : 0);
