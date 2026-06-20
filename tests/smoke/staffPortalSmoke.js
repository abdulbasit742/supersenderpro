#!/usr/bin/env node
// tests/smoke/staffPortalSmoke.js — Offline smoke test. No server, no external APIs, no live actions.
'use strict';
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let svc, red;
check('require service module', () => { svc = require('../../lib/staffPortal/staffPortalService'); assert(svc.getStaffPortalStatus, 'no service'); return 'ok'; });
check('require redactor', () => { red = require('../../lib/staffPortal/redactor'); assert(red.maskCnic, 'no redactor'); return 'ok'; });
check('require route module', () => { require('../../routes/staffPortalRoutes'); return 'loaded'; });

function assertSafe(resp, label) {
  assert(resp.dryRun === true, `${label}: dryRun not true`);
  assert(resp.liveActionsEnabled === false, `${label}: liveActionsEnabled not false`);
  for (const [k, v] of Object.entries(resp)) {
    if (/^live[A-Z]/.test(k)) assert(v === false, `${label}: ${k} is truthy`);
  }
  return true;
}

check('getStaffPortalStatus works + safe', () => { const s = svc.getStaffPortalStatus(); assertSafe(s, 'status'); assert(s.staffPortalPublicLive === false && s.externalCallsEnabled === false, 'unsafe flags'); return 'safe'; });
check('lookupStaffPreview works + masked', () => { const l = svc.lookupStaffPreview({ mode: 'preview_token' }); assert(l.dryRun && l.liveAuthEnabled === false, 'unsafe'); assert(l.phoneMasked.includes('*') && l.emailMasked.includes('*'), 'pii not masked'); return l.lookupMode; });
check('getStaffSummaryPreview works (modules ok)', () => { const s = svc.getStaffSummaryPreview({}); assertSafe(s, 'summary'); assert(s.piiMasked === true, 'pii not masked'); return `leave ${s.leaveBalancePreview}`; });

check('leave request preview liveLeaveMutation false', () => { const r = svc.createLeaveRequestPreview({ from: 'a', to: 'b' }); assertSafe(r, 'leave'); assert(r.liveLeaveMutation === false && r.liveApprovalMutation === false, 'live'); return 'safe'; });
check('expense request preview liveExpenseMutation false', () => { const r = svc.createExpenseRequestPreview({ amount: 5 }); assertSafe(r, 'expense'); assert(r.liveExpenseMutation === false && r.livePaymentAction === false, 'live'); return 'safe'; });
check('payroll livePayrollMutation + livePaymentAction false', () => { const r = svc.getPayrollSummaryPreview({}); assertSafe(r, 'payroll'); assert(r.livePayrollMutation === false && r.livePaymentAction === false, 'live'); return 'safe'; });
check('attendance no checkin/checkout/mutation', () => { const r = svc.getAttendanceStatusPreview({}); assertSafe(r, 'attendance'); assert(r.liveAttendanceMutation === false && r.liveCheckIn === false && r.liveCheckOut === false, 'live'); return 'safe'; });
check('HR support preview liveTicketCreation false', () => { const r = svc.createHrSupportRequestPreview({ message: 'x' }); assertSafe(r, 'hr'); assert(r.liveTicketCreation === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('document request preview liveDocumentDownload false', () => { const r = svc.createDocumentRequestPreview({ documentId: 'd' }); assertSafe(r, 'doc'); assert(r.liveDocumentDownload === false && r.liveShare === false, 'live'); return 'safe'; });
check('message draft preview liveSend false', () => { const r = svc.createMessageDraftPreview({ message: 'x' }); assertSafe(r, 'message'); assert(r.liveSend === false, 'live'); return r.recipientMasked; });

['getProfilePreview', 'getShiftStatusPreview', 'getLeaveStatusPreview', 'getPayslipMetadataPreview', 'getCommissionSummaryPreview',
 'getExpenseStatusPreview', 'getTaskStatusPreview', 'getSopStatusPreview', 'getBranchAssignmentPreview',
 'getApprovalStatusPreview', 'getDocumentStatusPreview', 'getContractStatusPreview'].forEach((fn) => {
  check(`${fn} safe`, () => { assertSafe(svc[fn]({}), fn); return 'safe'; });
});

check('audit preview no live write', () => { const a = svc.getAuditPreview(); assert(a.liveAuditWrite === false, 'live'); return `${a.auditPreview.length} entries`; });
check('redactor masking examples', () => {
  assert(red.maskPhone('+923001234567') === '+92******4567', 'phone');
  assert(/^st\*+@example\.com$/.test(red.maskEmail('staff@example.com')), 'email');
  assert(red.maskCnic() === 'cnic_****' && red.maskBankRef() === 'bank_****' && red.maskSalary() === 'salary_****', 'refs');
  return 'ok';
});
check('no full PII in aggregate blob', () => {
  const blob = JSON.stringify({ status: svc.getStaffPortalStatus(), lookup: svc.lookupStaffPreview({}), summary: svc.getStaffSummaryPreview({}),
    payroll: svc.getPayrollSummaryPreview({}), payslips: svc.listPayslips({}), documents: svc.listDocuments({}), msg: svc.createMessageDraftPreview({ message: 'x' }) });
  assert(!red.hasLeak(blob), 'leak detected');
  return 'clean';
});
check('missing-module fallback does not crash', () => { const s = svc.getStaffSummaryPreview({ mode: 'unknown_mode' }); assert(s.ok === true, 'crashed'); return 'ok'; });

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'staff_portal_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Staff Portal Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed ✅\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? '✅' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'staff_portal_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
