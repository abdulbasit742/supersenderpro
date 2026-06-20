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
check('require redactor', () => { red = require('../../lib/staffPortal/redactor'); assert(red.maskPhone, 'no redactor'); return 'ok'; });
check('require route module', () => { require('../../routes/staffPortalRoutes'); return 'loaded'; });

// Every response must carry dryRun:true + liveActionsEnabled:false and NO truthy live-* flag.
function assertSafe(resp, label) {
  assert(resp.dryRun === true, `${label}: dryRun not true`);
  assert(resp.liveActionsEnabled === false, `${label}: liveActionsEnabled not false`);
  for (const [k, v] of Object.entries(resp)) {
    if (/^live[A-Z]/.test(k)) assert(v === false, `${label}: ${k} is truthy`);
  }
  return true;
}

check('portal status is safe', () => { const s = svc.getStaffPortalStatus(); assertSafe(s, 'status'); assert(s.externalCallsEnabled === false, 'external calls on'); assert(s.staffPortalPublicLive === false, 'public live on'); return 'safe'; });
check('lookup preview safe + masked', () => { const l = svc.lookupStaffPreview({ mode: 'preview_token' }); assert(l.dryRun === true && l.liveAuthEnabled === false, 'unsafe'); assert(l.phoneMasked.includes('*') && l.emailMasked.includes('*'), 'pii not masked'); return l.lookupMode; });
check('summary works even though no real modules', () => { const s = svc.getStaffSummaryPreview({}); assertSafe(s, 'summary'); assert(s.piiMasked === true, 'pii not masked'); assert(s.staffPortalPublicLive === false, 'public live'); return `${s.pendingLeaveRequestsPreview} pending leave`; });

['getProfileStatusPreview', 'getAttendanceStatusPreview', 'getShiftStatusPreview', 'getLeaveStatusPreview',
 'getPayrollSummaryPreview', 'getPayslipMetadataPreview', 'getCommissionSummaryPreview', 'getExpenseStatusPreview',
 'getTaskStatusPreview', 'getSopStatusPreview', 'getBranchAssignmentPreview', 'getApprovalStatusPreview',
 'getContractStatusPreview', 'getDocumentStatusPreview'].forEach((fn) => {
  check(`${fn} safe`, () => { const r = svc[fn]({}); assertSafe(r, fn); return 'safe'; });
});

check('leave request preview safe (no live leave/approval mutation)', () => { const r = svc.createLeaveRequestPreview({ dates: ['2026-07-01'] }); assertSafe(r, 'leave'); assert(r.liveLeaveMutation === false && r.liveApprovalMutation === false, 'live'); return 'safe'; });
check('expense request preview safe (no live expense mutation)', () => { const r = svc.createExpenseRequestPreview({ amount: 0 }); assertSafe(r, 'expense'); assert(r.liveExpenseMutation === false && r.livePaymentAction === false, 'live'); return 'safe'; });
check('hr support preview safe (no live ticket creation)', () => { const r = svc.createHrSupportRequestPreview({ message: 'hi' }); assertSafe(r, 'hr'); assert(r.liveTicketCreation === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('document request preview safe (no download)', () => { const r = svc.createDocumentRequestPreview({ documentId: 'doc_1' }); assertSafe(r, 'doc'); assert(r.liveDocumentDownload === false && r.liveShare === false, 'live'); return 'safe'; });
check('message draft preview safe (no live send)', () => { const r = svc.createMessageDraftPreview({ message: 'x' }); assertSafe(r, 'message'); assert(r.liveSend === false, 'live send'); return r.recipientMasked; });
check('payroll preview has no live payroll/payment mutation', () => { const r = svc.getPayrollSummaryPreview({}); assert(r.livePayrollMutation === false && r.livePaymentAction === false, 'live'); assert(r.paymentStatusPreview === 'preview_only', 'not preview'); return r.bankRefMasked; });
check('payslip metadata only (no download)', () => { const r = svc.getPayslipMetadataPreview({}); assert(r.liveDocumentDownload === false && r.downloadEnabled === false, 'download enabled'); return 'safe'; });
check('attendance has no check-in/out mutation', () => { const r = svc.getAttendanceStatusPreview({}); assert(r.liveAttendanceMutation === false && r.liveCheckIn === false && r.liveCheckOut === false, 'live'); return 'safe'; });
check('audit preview is local + no live write', () => { const a = svc.getAuditPreview(); assert(a.liveAuditWrite === false, 'live audit'); return `${a.auditPreview.length} entries`; });

check('redactor masking examples', () => {
  assert(red.maskPhone('+923001234567') === '+92******4567', 'phone');
  assert(/^st\*+@example\.com$/.test(red.maskEmail('staff@example.com')), 'email');
  assert(red.maskRef('task_7001') === 'task_****', 'ref');
  assert(red.maskBankRef('x') === 'bank_****', 'bank');
  assert(red.maskCnic('x') === 'cnic_****', 'cnic');
  assert(red.maskSalary(1) === 'salary_****', 'salary');
  assert(red.maskPaymentRef('x') === 'pay_****', 'payment');
  return 'ok';
});
check('no full PII in aggregate response blob', () => {
  const blob = JSON.stringify({
    status: svc.getStaffPortalStatus(), lookup: svc.lookupStaffPreview({}), summary: svc.getStaffSummaryPreview({}),
    profile: svc.getProfileStatusPreview({}), payroll: svc.getPayrollSummaryPreview({}), payslips: svc.listPayslips({}),
    leave: svc.getLeaveStatusPreview({}), expenses: svc.listExpenses({}), documents: svc.listDocuments({}),
    contracts: svc.listContracts({}), msg: svc.createMessageDraftPreview({ message: 'x' }), audit: svc.getAuditPreview(),
  });
  assert(!red.hasLeak(blob), 'leak detected');
  return 'clean';
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'staff_portal_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Staff Portal Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'staff_portal_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
