#!/usr/bin/env node
// tests/smoke/franchisePortalSmoke.js — Offline smoke test. No server, no external APIs, no live actions.
'use strict';
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let svc, red;
check('require service module', () => { svc = require('../../lib/franchisePortal/franchisePortalService'); assert(svc.getFranchisePortalStatus, 'no service'); return 'ok'; });
check('require redactor', () => { red = require('../../lib/franchisePortal/redactor'); assert(red.maskPhone, 'no redactor'); return 'ok'; });
check('require route module', () => { require('../../routes/franchisePortalRoutes'); return 'loaded'; });

function assertSafe(resp, label) {
  assert(resp.dryRun === true, `${label}: dryRun not true`);
  assert(resp.liveActionsEnabled === false, `${label}: liveActionsEnabled not false`);
  for (const [k, v] of Object.entries(resp)) {
    if (/^live[A-Z]/.test(k)) assert(v === false, `${label}: ${k} is truthy`);
  }
  return true;
}

check('portal status is safe', () => { const s = svc.getFranchisePortalStatus(); assertSafe(s, 'status'); assert(s.externalCallsEnabled === false, 'external'); assert(s.franchisePortalPublicLive === false, 'public live'); return 'safe'; });
check('lookup preview safe + masked', () => { const l = svc.lookupFranchisePreview({ mode: 'preview_token' }); assert(l.dryRun === true && l.liveAuthEnabled === false, 'unsafe'); assert(l.phoneMasked.includes('*') && l.emailMasked.includes('*'), 'pii'); return l.lookupMode; });
check('summary works even though no real modules', () => { const s = svc.getFranchiseSummaryPreview({}); assertSafe(s, 'summary'); assert(s.piiMasked === true, 'pii'); assert(s.franchisePortalPublicLive === false, 'public live'); return `${s.totalOutletsPreview} outlets`; });

['getFranchiseProfilePreview', 'getTierStatusPreview', 'getOutletAccountStatusPreview', 'getSalesSummaryPreview',
 'getTargetAchievementPreview', 'getRoyaltySummaryPreview', 'getRoyaltyPaymentStatusPreview', 'getOutstandingPayablePreview',
 'getInventoryAllocationPreview', 'getOrderStatusPreview', 'getMarketingFundPreview', 'getHeadcountPreview',
 'getComplianceChecklistPreview', 'getTerritoryAssignmentPreview', 'getContractStatusPreview'].forEach((fn) => {
  check(`${fn} safe`, () => { const r = svc[fn]({}); assertSafe(r, fn); return 'safe'; });
});

check('replenishment draft safe (no live order/stock)', () => { const r = svc.createReplenishmentDraftPreview({ outletId: 'outlet_1', items: [{ sku: 'sku_1', qty: 10 }] }); assertSafe(r, 'repl'); assert(r.liveOrderCreation === false && r.liveStockReservation === false && r.liveStockMutation === false, 'live'); return `${r.replenishmentDraftPreview.itemCountPreview} items`; });
check('royalty summary safe (no royalty/payment mutation)', () => { const r = svc.getRoyaltySummaryPreview({}); assertSafe(r, 'royalty'); assert(r.liveRoyaltyMutation === false && r.livePaymentAction === false, 'live'); return 'safe'; });
check('royalty payment safe (no payment action)', () => { const r = svc.getRoyaltyPaymentStatusPreview({}); assertSafe(r, 'pay'); assert(r.livePaymentAction === false && r.liveInvoiceMutation === false, 'live'); return r.paymentReferenceMasked; });
check('outstanding payable safe (no payment action)', () => { const r = svc.getOutstandingPayablePreview({}); assertSafe(r, 'payable'); assert(r.livePaymentAction === false, 'live'); return `${r.outstandingPayablePreview}`; });
check('inventory safe (no stock mutation/reservation)', () => { const r = svc.getInventoryAllocationPreview({}); assertSafe(r, 'inv'); assert(r.liveStockMutation === false && r.liveStockReservation === false, 'live'); return 'safe'; });
check('marketing fund safe (no fund/payment mutation)', () => { const r = svc.getMarketingFundPreview({}); assertSafe(r, 'fund'); assert(r.liveFundMutation === false && r.livePaymentAction === false, 'live'); return 'safe'; });
check('document request safe (no download)', () => { const r = svc.createDocumentRequestPreview({ documentId: 'doc_1' }); assertSafe(r, 'doc'); assert(r.liveDocumentDownload === false && r.liveShare === false, 'live'); return 'safe'; });
check('support request safe (no live ticket creation)', () => { const r = svc.createSupportRequestPreview({ message: 'hi' }); assertSafe(r, 'support'); assert(r.liveTicketCreation === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('message draft safe (no live send)', () => { const r = svc.createMessageDraftPreview({ message: 'x' }); assertSafe(r, 'message'); assert(r.liveSend === false, 'live send'); return r.recipientMasked; });
check('audit preview is local + no live write', () => { const a = svc.getAuditPreview(); assert(a.liveAuditWrite === false, 'live audit'); return `${a.auditPreview.length} entries`; });

check('redactor masking examples', () => {
  assert(red.maskPhone('+923001234567') === '+92******4567', 'phone');
  assert(/^fr\*+@example\.com$/.test(red.maskEmail('franchise@example.com')), 'email');
  assert(red.maskRef('rord_3001') === 'rord_****', 'order');
  assert(red.maskRef('finv_2001') === 'finv_****', 'invoice');
  assert(red.maskPaymentRef('x') === 'pay_****', 'payment');
  assert(red.maskTaxRef('x') === 'tax_****', 'tax');
  assert(red.maskDocumentRef('x') === 'doc_****', 'document');
  return 'ok';
});
check('no full PII in aggregate response blob', () => {
  const blob = JSON.stringify({
    status: svc.getFranchisePortalStatus(), lookup: svc.lookupFranchisePreview({}), summary: svc.getFranchiseSummaryPreview({}),
    profile: svc.getFranchiseProfilePreview({}), outlets: svc.listOutlets({}), sales: svc.getSalesSummaryPreview({}),
    invoices: svc.listRoyaltyInvoices({}), payable: svc.getOutstandingPayablePreview({}), documents: svc.listDocuments({}),
    repl: svc.createReplenishmentDraftPreview({ outletId: 'o1', items: [{ sku: 'sku_1', qty: 1 }] }), msg: svc.createMessageDraftPreview({ message: 'x' }), audit: svc.getAuditPreview(),
  });
  assert(!red.hasLeak(blob), 'leak detected');
  return 'clean';
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'franchise_portal_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Franchise Portal Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'franchise_portal_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
