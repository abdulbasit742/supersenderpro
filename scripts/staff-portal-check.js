#!/usr/bin/env node
// scripts/staff-portal-check.js — Validates Staff Portal install + safe behaviour. No server, no external calls.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (r) => fs.existsSync(path.join(ROOT, r));

const LIB = [
  'store.js', 'staffPortalModel.js', 'staffPortalService.js', 'statusSummaryPreview.js',
  'profileStatusPreview.js', 'attendanceStatusPreview.js', 'shiftStatusPreview.js', 'leaveStatusPreview.js',
  'leaveRequestPreview.js', 'payrollSummaryPreview.js', 'payslipMetadataPreview.js', 'commissionSummaryPreview.js',
  'expenseStatusPreview.js', 'expenseRequestPreview.js', 'taskStatusPreview.js', 'sopStatusPreview.js',
  'branchAssignmentPreview.js', 'approvalStatusPreview.js', 'documentRequestPreview.js', 'contractStatusPreview.js',
  'hrSupportRequestPreview.js', 'messageDrafts.js', 'auditPreview.js', 'redactor.js',
];
LIB.forEach((f) => add(`file lib/staffPortal/${f}`, exists(`lib/staffPortal/${f}`)));
['routes/staffPortalRoutes.js', 'public/staff-portal.html', 'public/js/staff-portal.js', 'public/css/staff-portal.css']
  .forEach((f) => add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('STAFF PORTAL HOOK'));

let leakBlob = '';
try {
  const svc = require('../lib/staffPortal/staffPortalService');
  const red = require('../lib/staffPortal/redactor');
  require('../routes/staffPortalRoutes');
  add('route module loads', true);

  // Exported functions exist
  const fns = ['getStaffPortalStatus', 'lookupStaffPreview', 'getStaffSummaryPreview', 'getProfileStatusPreview',
    'getAttendanceStatusPreview', 'getShiftStatusPreview', 'getLeaveStatusPreview', 'createLeaveRequestPreview',
    'getPayrollSummaryPreview', 'getPayslipMetadataPreview', 'getCommissionSummaryPreview', 'getExpenseStatusPreview',
    'createExpenseRequestPreview', 'getTaskStatusPreview', 'getSopStatusPreview', 'getBranchAssignmentPreview',
    'getApprovalStatusPreview', 'getContractStatusPreview', 'getDocumentStatusPreview', 'createDocumentRequestPreview',
    'createHrSupportRequestPreview', 'createMessageDraftPreview', 'getAuditPreview'];
  add('all service functions exported', fns.every((f) => typeof svc[f] === 'function'), fns.filter((f) => typeof svc[f] !== 'function').join(',') || 'all present');

  const status = svc.getStaffPortalStatus();
  add('status dryRun true + liveActionsEnabled false', status.dryRun === true && status.liveActionsEnabled === false);
  add('status staffPortalPublicLive false', status.staffPortalPublicLive === false);
  add('status piiMasked true', status.piiMasked === true);
  add('status externalCallsEnabled false', status.externalCallsEnabled === false);

  add('redactor masks phone', red.maskPhone('+923001234567') === '+92******4567', red.maskPhone('+923001234567'));
  add('redactor masks email', /^st\*+@example\.com$/.test(red.maskEmail('staff@example.com')), red.maskEmail('staff@example.com'));
  add('redactor masks ref', red.maskRef('task_7001') === 'task_****');
  add('redactor masks bank', red.maskBankRef('bank_secret') === 'bank_****');
  add('redactor masks cnic', red.maskCnic('42101-1234567-8') === 'cnic_****');
  add('redactor masks salary', red.maskSalary(99999) === 'salary_****');
  add('redactor masks payment', red.maskPaymentRef('pay_secret') === 'pay_****');
  add('redactor masks document via redactDocument', red.redactDocument({ id: 'doc_1', name: 'x', status: 'available' }).documentIdPreview === 'doc_****');

  const payroll = svc.getPayrollSummaryPreview({});
  add('payroll livePayrollMutation false', payroll.livePayrollMutation === false && payroll.livePaymentAction === false);
  const leave = svc.createLeaveRequestPreview({ dates: ['a'] });
  add('leave request liveLeaveMutation false', leave.liveLeaveMutation === false && leave.liveApprovalMutation === false);
  const exp = svc.createExpenseRequestPreview({ amount: 1 });
  add('expense request liveExpenseMutation false', exp.liveExpenseMutation === false);
  const hr = svc.createHrSupportRequestPreview({ message: 'x' });
  add('hr support liveTicketCreation false', hr.liveTicketCreation === false && hr.liveMessageSend === false);
  const msg = svc.createMessageDraftPreview({ message: 'hi' });
  add('message draft liveSend false + masked recipient', msg.liveSend === false && msg.recipientMasked.includes('*'));
  const sum = svc.getStaffSummaryPreview({});
  add('summary piiMasked true + works without modules', sum.piiMasked === true);

  leakBlob = JSON.stringify({ status, payroll, leave, exp, hr, msg, sum,
    attendance: svc.listAttendance({}), payslips: svc.listPayslips({}), docs: svc.listDocuments({}), audit: svc.getAuditPreview() });
  add('no PII/secret leak', !red.hasLeak(leakBlob));
} catch (e) {
  add('functional pipeline', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, strict: String(process.env.STAFF_PORTAL_STRICT || 'false'), checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'staff_portal_check.json'), JSON.stringify(out, null, 2));
let md = `# Staff Portal Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? 'PASS' : 'FAIL'} | ${c.detail.replace(/\|/g, '/')} |\n`; });
fs.writeFileSync(path.join(dir, 'staff_portal_check.md'), md);
console.log(md);
const strict = String(process.env.STAFF_PORTAL_STRICT || '').toLowerCase() === 'true';
process.exit((strict && failed > 0) ? 1 : 0);
