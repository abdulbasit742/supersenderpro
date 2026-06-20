#!/usr/bin/env node
// tests/smoke/customerPortalSmoke.js — Offline smoke test. No server, no external APIs, no live actions.
'use strict';
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let svc, red;
check('require service module', () => { svc = require('../../lib/customerPortal/customerPortalService'); assert(svc.getPortalStatus, 'no service'); return 'ok'; });
check('require redactor', () => { red = require('../../lib/customerPortal/redactor'); assert(red.maskPhone, 'no redactor'); return 'ok'; });
check('require route module', () => { require('../../routes/customerPortalRoutes'); return 'loaded'; });

// Every response must carry dryRun:true + liveActionsEnabled:false and NO truthy live-* flag.
function assertSafe(resp, label) {
  assert(resp.dryRun === true, `${label}: dryRun not true`);
  assert(resp.liveActionsEnabled === false, `${label}: liveActionsEnabled not false`);
  for (const [k, v] of Object.entries(resp)) {
    if (/^live[A-Z]/.test(k) || k === 'livePayment' || k === 'liveSend') {
      assert(v === false, `${label}: ${k} is truthy`);
    }
  }
  return true;
}

check('portal status is safe', () => { const s = svc.getPortalStatus(); assertSafe(s, 'status'); assert(s.externalCallsEnabled === false, 'external calls on'); return 'safe'; });
check('lookup preview safe + masked', () => { const l = svc.lookupCustomerPreview({ mode: 'preview_token' }); assert(l.dryRun === true && l.liveAuthEnabled === false, 'unsafe'); assert(l.phoneMasked.includes('*') && l.emailMasked.includes('*'), 'pii not masked'); return l.lookupMode; });
check('summary works even though no real modules', () => { const s = svc.getCustomerSummaryPreview({}); assertSafe(s, 'summary'); assert(s.piiMasked === true, 'pii not masked'); return `${s.unpaidInvoicesPreview} unpaid`; });

['getOrderStatusPreview', 'getInvoiceStatusPreview', 'getBookingStatusPreview', 'getServiceStatusPreview',
 'getMaintenanceStatusPreview', 'getTicketStatusPreview', 'getWarrantyStatusPreview', 'getLoyaltyStatusPreview',
 'getContractStatusPreview', 'getDocumentStatusPreview'].forEach((fn) => {
  check(`${fn} safe`, () => { const r = svc[fn]({}); assertSafe(r, fn); return 'safe'; });
});

check('support request preview safe', () => { const r = svc.createSupportRequestPreview({ message: 'hi' }); assertSafe(r, 'support'); assert(r.liveTicketCreation === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('document request preview safe', () => { const r = svc.createDocumentRequestPreview({ documentId: 'doc_1' }); assertSafe(r, 'doc'); assert(r.liveDocumentDownload === false && r.liveShare === false, 'live'); return 'safe'; });
check('reschedule preview safe', () => { assertSafe(svc.createRescheduleRequestPreview({}), 'reschedule'); return 'safe'; });
check('payment reminder preview safe (no live payment)', () => { const r = svc.createPaymentReminderPreview({}); assertSafe(r, 'reminder'); assert(r.livePayment === false, 'live payment'); return 'safe'; });
check('message draft preview safe (no live send)', () => { const r = svc.createMessageDraftPreview({ message: 'x' }); assertSafe(r, 'message'); assert(r.liveSend === false, 'live send'); return r.recipientMasked; });
check('audit preview is local + no live write', () => { const a = svc.getAuditPreview(); assert(a.liveAuditWrite === false, 'live audit'); return `${a.auditPreview.length} entries`; });

check('redactor masking examples', () => {
  assert(red.maskPhone('+923001234567') === '+92******4567', 'phone');
  assert(/^cu\*+@example\.com$/.test(red.maskEmail('customer@example.com')), 'email');
  assert(red.maskRef('ord_1001') === 'ord_****', 'ref');
  return 'ok';
});
check('no full PII in aggregate response blob', () => {
  const blob = JSON.stringify({
    status: svc.getPortalStatus(), lookup: svc.lookupCustomerPreview({}), summary: svc.getCustomerSummaryPreview({}),
    orders: svc.listOrders({}), invoices: svc.listInvoices({}), documents: svc.listDocuments({}),
    msg: svc.createMessageDraftPreview({ message: 'x' }), audit: svc.getAuditPreview(),
  });
  assert(!red.hasLeak(blob), 'leak detected');
  return 'clean';
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'customer_portal_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Customer Portal Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed ✅\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? '✅' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'customer_portal_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
