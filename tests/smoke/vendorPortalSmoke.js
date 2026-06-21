#!/usr/bin/env node
// tests/smoke/vendorPortalSmoke.js — Offline smoke test. No server, no external APIs, no live actions.
'use strict';
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let svc, red;
check('require service module', () => { svc = require('../../lib/vendorPortal/vendorPortalService'); assert(svc.getVendorPortalStatus, 'no service'); return 'ok'; });
check('require redactor', () => { red = require('../../lib/vendorPortal/redactor'); assert(red.maskPhone, 'no redactor'); return 'ok'; });
check('require route module', () => { require('../../routes/vendorPortalRoutes'); return 'loaded'; });

function assertSafe(resp, label) {
  assert(resp.dryRun === true, `${label}: dryRun not true`);
  assert(resp.liveActionsEnabled === false, `${label}: liveActionsEnabled not false`);
  for (const [k, v] of Object.entries(resp)) {
    if (/^live[A-Z]/.test(k)) assert(v === false, `${label}: ${k} is truthy`);
  }
  return true;
}

check('portal status is safe', () => { const s = svc.getVendorPortalStatus(); assertSafe(s, 'status'); assert(s.externalCallsEnabled === false, 'external'); assert(s.vendorPortalPublicLive === false, 'public live'); return 'safe'; });
check('lookup preview safe + masked', () => { const l = svc.lookupVendorPreview({ mode: 'preview_token' }); assert(l.dryRun === true && l.liveAuthEnabled === false, 'unsafe'); assert(l.phoneMasked.includes('*') && l.emailMasked.includes('*'), 'pii not masked'); return l.lookupMode; });
check('summary works even though no real modules', () => { const s = svc.getVendorSummaryPreview({}); assertSafe(s, 'summary'); assert(s.piiMasked === true, 'pii'); assert(s.vendorPortalPublicLive === false, 'public live'); return `${s.unpaidInvoicesPreview} unpaid`; });

['getVendorProfilePreview', 'getTierStatusPreview', 'getAccountStatusPreview', 'getSupplyCatalogPreview',
 'getPurchasePriceListPreview', 'getPurchaseOrderStatusPreview', 'getGrnStatusPreview', 'getInvoicePaymentStatusPreview',
 'getOutstandingPayablePreview', 'getPaymentSchedulePreview', 'getQualityInspectionPreview', 'getComplianceDocumentPreview',
 'getContractStatusPreview', 'getRatingStatusPreview'].forEach((fn) => {
  check(`${fn} safe`, () => { const r = svc[fn]({}); assertSafe(r, fn); return 'safe'; });
});

check('invoice submission safe (no live submission/payment)', () => { const r = svc.createInvoiceSubmissionPreview({ poId: 'po_1', items: [{ sku: 'sku_1', qty: 1, unitPrice: 10 }] }); assertSafe(r, 'invSub'); assert(r.liveInvoiceSubmission === false && r.liveInvoiceMutation === false && r.livePaymentAction === false, 'live'); return `total ${r.invoiceDraftPreview.totalPreview}`; });
check('invoice/payment safe (no live payment action)', () => { const r = svc.getInvoicePaymentStatusPreview({}); assertSafe(r, 'pay'); assert(r.livePaymentAction === false && r.liveInvoiceMutation === false, 'live'); return r.paymentReferenceMasked; });
check('outstanding payable safe (no payment action)', () => { const r = svc.getOutstandingPayablePreview({}); assertSafe(r, 'payable'); assert(r.livePaymentAction === false, 'live'); return `${r.outstandingPayablePreview}`; });
check('document request safe (no download)', () => { const r = svc.createDocumentRequestPreview({ documentId: 'doc_1' }); assertSafe(r, 'doc'); assert(r.liveDocumentDownload === false && r.liveShare === false, 'live'); return 'safe'; });
check('payment query safe (no payment action/send)', () => { const r = svc.createPaymentQueryPreview({ invoiceId: 'vinv_1' }); assertSafe(r, 'payQuery'); assert(r.livePaymentAction === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('support request safe (no live ticket creation)', () => { const r = svc.createSupportRequestPreview({ message: 'hi' }); assertSafe(r, 'support'); assert(r.liveTicketCreation === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('message draft safe (no live send)', () => { const r = svc.createMessageDraftPreview({ message: 'x' }); assertSafe(r, 'message'); assert(r.liveSend === false, 'live send'); return r.recipientMasked; });
check('audit preview is local + no live write', () => { const a = svc.getAuditPreview(); assert(a.liveAuditWrite === false, 'live audit'); return `${a.auditPreview.length} entries`; });

check('redactor masking examples', () => {
  assert(red.maskPhone('+923001234567') === '+92******4567', 'phone');
  assert(/^ve\*+@example\.com$/.test(red.maskEmail('vendor@example.com')), 'email');
  assert(red.maskRef('po_1001') === 'po_****', 'po');
  assert(red.maskRef('vinv_3001') === 'vinv_****', 'invoice');
  assert(red.maskPaymentRef('x') === 'pay_****', 'payment');
  assert(red.maskBankRef('x') === 'bank_****', 'bank');
  assert(red.maskTaxRef('x') === 'tax_****', 'tax');
  assert(red.maskDocumentRef('x') === 'doc_****', 'document');
  return 'ok';
});
check('no full PII in aggregate response blob', () => {
  const blob = JSON.stringify({
    status: svc.getVendorPortalStatus(), lookup: svc.lookupVendorPreview({}), summary: svc.getVendorSummaryPreview({}),
    profile: svc.getVendorProfilePreview({}), catalog: svc.getSupplyCatalogPreview({}), price: svc.getPurchasePriceListPreview({}),
    invoices: svc.listInvoices({}), payable: svc.getOutstandingPayablePreview({}), documents: svc.listDocuments({}),
    inv: svc.createInvoiceSubmissionPreview({ poId: 'po_1', items: [{ sku: 'sku_1', qty: 1, unitPrice: 1 }] }), msg: svc.createMessageDraftPreview({ message: 'x' }), audit: svc.getAuditPreview(),
  });
  assert(!red.hasLeak(blob), 'leak detected');
  return 'clean';
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'vendor_portal_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Vendor Portal Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'vendor_portal_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
