#!/usr/bin/env node
// tests/smoke/dealerPortalSmoke.js — Offline smoke test. No server, no external APIs, no live actions.
'use strict';
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let svc, red;
check('require service module', () => { svc = require('../../lib/dealerPortal/dealerPortalService'); assert(svc.getDealerPortalStatus, 'no service'); return 'ok'; });
check('require redactor', () => { red = require('../../lib/dealerPortal/redactor'); assert(red.maskPhone, 'no redactor'); return 'ok'; });
check('require route module', () => { require('../../routes/dealerPortalRoutes'); return 'loaded'; });

function assertSafe(resp, label) {
  assert(resp.dryRun === true, `${label}: dryRun not true`);
  assert(resp.liveActionsEnabled === false, `${label}: liveActionsEnabled not false`);
  for (const [k, v] of Object.entries(resp)) {
    if (/^live[A-Z]/.test(k)) assert(v === false, `${label}: ${k} is truthy`);
  }
  return true;
}

check('portal status is safe', () => { const s = svc.getDealerPortalStatus(); assertSafe(s, 'status'); assert(s.externalCallsEnabled === false, 'external calls on'); assert(s.dealerPortalPublicLive === false, 'public live on'); return 'safe'; });
check('lookup preview safe + masked', () => { const l = svc.lookupDealerPreview({ mode: 'preview_token' }); assert(l.dryRun === true && l.liveAuthEnabled === false, 'unsafe'); assert(l.phoneMasked.includes('*') && l.emailMasked.includes('*'), 'pii not masked'); return l.lookupMode; });
check('summary works even though no real modules', () => { const s = svc.getDealerSummaryPreview({}); assertSafe(s, 'summary'); assert(s.piiMasked === true, 'pii not masked'); assert(s.dealerPortalPublicLive === false, 'public live'); return `${s.unpaidInvoicesPreview} unpaid`; });

['getDealerProfilePreview', 'getTierStatusPreview', 'getB2bAccountStatusPreview', 'getCatalogPreview',
 'getDealerPriceListPreview', 'getWholesalePricePreview', 'getStockAvailabilityPreview', 'getMoqPreview',
 'getOrderStatusPreview', 'getInvoicePaymentStatusPreview', 'getCreditLimitPreview', 'getOutstandingBalancePreview',
 'getCommissionMarginPreview', 'getReturnClaimStatusPreview', 'getWarrantyClaimStatusPreview', 'getLoyaltyStatusPreview',
 'getContractStatusPreview'].forEach((fn) => {
  check(`${fn} safe`, () => { const r = svc[fn]({}); assertSafe(r, fn); return 'safe'; });
});

check('bulk order draft safe (no live order creation/stock reservation)', () => { const r = svc.createBulkOrderDraftPreview({ items: [{ productId: 'prod_1', qty: 60 }] }); assertSafe(r, 'bulk'); assert(r.liveOrderCreation === false && r.liveStockReservation === false && r.liveStockMutation === false && r.livePriceMutation === false, 'live'); return `total ${r.orderDraftPreview.totalPreview}`; });
check('quotation request safe (no live quotation creation)', () => { const r = svc.createQuotationRequestPreview({ items: [] }); assertSafe(r, 'quote'); assert(r.liveQuotationCreation === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('invoice/payment safe (no live payment action)', () => { const r = svc.getInvoicePaymentStatusPreview({}); assertSafe(r, 'inv'); assert(r.livePaymentAction === false && r.liveInvoiceMutation === false, 'live'); return r.paymentReferenceMasked; });
check('credit limit safe (no live credit mutation)', () => { const r = svc.getCreditLimitPreview({}); assertSafe(r, 'credit'); assert(r.liveCreditMutation === false, 'live'); return `${r.availableCreditPreview} avail`; });
check('document request safe (no download)', () => { const r = svc.createDocumentRequestPreview({ documentId: 'doc_1' }); assertSafe(r, 'doc'); assert(r.liveDocumentDownload === false && r.liveShare === false, 'live'); return 'safe'; });
check('payment query safe (no payment action/send)', () => { const r = svc.createPaymentQueryPreview({ invoiceId: 'inv_1' }); assertSafe(r, 'payQuery'); assert(r.livePaymentAction === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('support request safe (no live ticket creation)', () => { const r = svc.createSupportRequestPreview({ message: 'hi' }); assertSafe(r, 'support'); assert(r.liveTicketCreation === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('message draft safe (no live send)', () => { const r = svc.createMessageDraftPreview({ message: 'x' }); assertSafe(r, 'message'); assert(r.liveSend === false, 'live send'); return r.recipientMasked; });
check('audit preview is local + no live write', () => { const a = svc.getAuditPreview(); assert(a.liveAuditWrite === false, 'live audit'); return `${a.auditPreview.length} entries`; });

check('redactor masking examples', () => {
  assert(red.maskPhone('+923001234567') === '+92******4567', 'phone');
  assert(/^de\*+@example\.com$/.test(red.maskEmail('dealer@example.com')), 'email');
  assert(red.maskRef('ord_1001') === 'ord_****', 'order');
  assert(red.maskRef('inv_2001') === 'inv_****', 'invoice');
  assert(red.maskPaymentRef('x') === 'pay_****', 'payment');
  assert(red.maskCreditRef('x') === 'credit_****', 'credit');
  assert(red.maskTaxRef('x') === 'tax_****', 'tax');
  assert(red.maskDocumentRef('x') === 'doc_****', 'document');
  return 'ok';
});
check('no full PII in aggregate response blob', () => {
  const blob = JSON.stringify({
    status: svc.getDealerPortalStatus(), lookup: svc.lookupDealerPreview({}), summary: svc.getDealerSummaryPreview({}),
    profile: svc.getDealerProfilePreview({}), catalog: svc.getCatalogPreview({}), price: svc.getDealerPriceListPreview({}),
    invoices: svc.listInvoices({}), credit: svc.getCreditLimitPreview({}), documents: svc.listDocuments({}),
    bulk: svc.createBulkOrderDraftPreview({ items: [{ productId: 'prod_1', qty: 1 }] }), msg: svc.createMessageDraftPreview({ message: 'x' }), audit: svc.getAuditPreview(),
  });
  assert(!red.hasLeak(blob), 'leak detected');
  return 'clean';
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'dealer_portal_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Dealer Portal Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'dealer_portal_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
