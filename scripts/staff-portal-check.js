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
  'store.js', 'staffPortalModel.js', 'staffPortalService.js', 'statusSummaryPreview.js', 'profileStatusPreview.js',
  'attendanceStatusPreview.js', 'shiftStatusPreview.js', 'leaveStatusPreview.js', 'leaveRequestPreview.js',
  'payrollSummaryPreview.js', 'payslipMetadataPreview.js', 'commissionSummaryPreview.js', 'expenseStatusPreview.js',
  'expenseRequestPreview.js', 'taskStatusPreview.js', 'sopStatusPreview.js', 'branchAssignmentPreview.js',
  'approvalStatusPreview.js', 'documentRequestPreview.js', 'contractStatusPreview.js', 'hrSupportRequestPreview.js',
  'messageDrafts.js', 'auditPreview.js', 'redactor.js',
];
LIB.forEach((f) => add(`file lib/staffPortal/${f}`, exists(`lib/staffPortal/${f}`)));
['routes/staffPortalRoutes.js', 'public/staff-portal.html', 'public/js/staff-portal.js', 'public/css/staff-portal.css']
  .forEach((f) => add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('STAFF PORTAL HOOK'));

try {
  const svc = require('../lib/staffPortal/staffPortalService');
  const red = require('../lib/staffPortal/redactor');
  require('../routes/staffPortalRoutes');
  add('route module loads', true);

  const fns = ['getStaffPortalStatus', 'lookupStaffPreview', 'getStaffSummaryPreview', 'getAttendanceStatusPreview',
    'getLeaveStatusPreview', 'createLeaveRequestPreview', 'getPayrollSummaryPreview', 'createExpenseRequestPreview',
    'createHrSupportRequestPreview', 'createDocumentRequestPreview', 'createMessageDraftPreview', 'getAuditPreview'];
  add('service functions exported', fns.every((f) => typeof svc[f] === 'function'), fns.filter((f) => typeof svc[f] !== 'function').join(',') || 'all present');

  const redFns = ['maskPhone', 'maskEmail', 'maskName', 'maskAddress', 'maskRef', 'maskBankRef', 'maskPaymentRef', 'maskCnic', 'maskSalary', 'safeText', 'redactStaff', 'redactPayroll', 'redactBank', 'redactPayment', 'redactDocument'];
  add('redactor functions exist', redFns.every((f) => typeof red[f] === 'function'), redFns.filter((f) => typeof red[f] !== 'function').join(',') || 'all present');

  const status = svc.getStaffPortalStatus();
  add('status dryRun true', status.dryRun === true);
  add('status liveActionsEnabled false', status.liveActionsEnabled === false);
  add('status staffPortalPublicLive false', status.staffPortalPublicLive === false);
  add('status externalCallsEnabled false', status.externalCallsEnabled === false);

  add('mask phone', red.maskPhone('+923001234567') === '+92******4567', red.maskPhone('+923001234567'));
  add('mask email', /^st\*+@example\.com$/.test(red.maskEmail('staff@example.com')), red.maskEmail('staff@example.com'));
  add('mask cnic', red.maskCnic() === 'cnic_****');
  add('mask bank ref', red.maskBankRef() === 'bank_****');
  add('mask salary', red.maskSalary() === 'salary_****');
  add('mask payment ref', red.maskPaymentRef() === 'pay_****');
  add('mask document ref', red.maskRef('doc_8001') === 'doc_****');

  const blob = JSON.stringify({ status, lk: svc.lookupStaffPreview({}), sum: svc.getStaffSummaryPreview({}),
    pay: svc.getPayrollSummaryPreview({}), msg: svc.createMessageDraftPreview({ message: 'x' }), audit: svc.getAuditPreview() });
  add('no PII/secret leak', !red.hasLeak(blob));
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
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '✅' : '❌'} | ${c.detail.replace(/\|/g, '/')} |\n`; });
fs.writeFileSync(path.join(dir, 'staff_portal_check.md'), md);
console.log(md);
const strict = String(process.env.STAFF_PORTAL_STRICT || '').toLowerCase() === 'true';
process.exit((strict && failed > 0) ? 1 : 0);
