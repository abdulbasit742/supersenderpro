// public/js/staff-portal.js — Staff Portal client. Preview-only: never pays, sends, downloads, or mutates.
const API = '/api/staff-portal';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

async function api(path, method = 'GET', body) {
  try {
    const opt = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opt.body = JSON.stringify(body);
    const r = await fetch(API + path, opt);
    return await r.json();
  } catch (e) {
    return { ok: false, error: 'network_error', warnings: [], blockers: [] };
  }
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const badge = (text, cls = '') => `<span class="badge ${cls}">${esc(text)}</span>`;
const time = (s) => esc(String(s || '').slice(0, 16).replace('T', ' '));
function statusClass(s) {
  s = String(s || '');
  if (/present|active|approved|completed|paid|available/.test(s)) return 'ok';
  if (/late|pending|overdue|expiring|missing|not_paid|absent|low/.test(s)) return 'warn';
  if (/block|suspend|terminate|reject|inactive/.test(s)) return 'bad';
  return '';
}
function rows(el, items, fn) {
  const node = $(el);
  if (!node) return;
  if (!items || !items.length) { node.innerHTML = '<div class="sp-empty">Nothing to show in this preview.</div>'; return; }
  node.innerHTML = items.map(fn).join('');
}

function renderSafetyBadges() {
  const items = ['Safe preview', 'dryRun true', 'No payroll mutation', 'No attendance mutation',
    'No leave mutation', 'No live sends', 'PII masked', 'External calls off'];
  $('#sp-safety-badges').innerHTML = items.map((k) => `<span class="sp-badge">✓ ${esc(k)}</span>`).join('');
}

async function loadStatus() {
  const status = await api('/status');
  renderSafetyBadges();
  return status;
}

async function loadAll() {
  // Profile + lookup
  const lookup = await api('/lookup-preview', 'POST', { mode: $('#sp-mode').value, reference: $('#sp-ref').value });
  if (lookup && lookup.ok) {
    $('#sp-error').hidden = true;
    $('#sp-profile').innerHTML = `<div class="row"><b>${esc(lookup.staffNameSafe)}</b> · ${esc(lookup.phoneMasked)} · ${esc(lookup.emailMasked)} · token ${esc(lookup.staffTokenPreview)}</div>`;
  } else {
    $('#sp-error').hidden = false;
    $('#sp-error').textContent = 'We could not load this preview right now. Please try again or contact HR/admin.';
  }

  const sum = await api('/summary');
  if (sum && sum.ok) {
    const lb = sum.leaveBalancePreview || {};
    const kpis = [
      ['Attendance', sum.attendanceTodayPreview], ['Annual leave', lb.annualLeavePreview],
      ['Pending leave', sum.pendingLeaveRequestsPreview], ['Assigned tasks', sum.assignedTasksPreview],
      ['Overdue tasks', sum.overdueTasksPreview], ['Open expenses', sum.openExpenseClaimsPreview],
    ];
    $('#sp-kpis').innerHTML = kpis.map(([k, v]) => `<div class="sp-kpi"><div class="k">${esc(k)}</div><div class="v">${v ?? '-'}</div></div>`).join('');
  }

  const [profile, attendance, shifts, leave, payroll, payslips, commission, expenses,
    tasks, sops, branch, approvals, documents, contracts, audit] = await Promise.all([
    api('/profile'), api('/attendance'), api('/shifts'), api('/leave'), api('/payroll'),
    api('/payslips'), api('/commission'), api('/expenses'), api('/tasks'), api('/sops'),
    api('/branch-assignment'), api('/approvals'), api('/documents'), api('/contracts'), api('/audit-preview'),
  ]);

  $('#sp-profile-card').innerHTML = profile && profile.ok
    ? `<div class="sp-row"><span>${esc(profile.roleSafe)} · ${esc(profile.branchSafe)}</span>${badge(profile.employmentStatusPreview, statusClass(profile.employmentStatusPreview))}</div>`
    : '<div class="sp-empty">No profile preview.</div>';

  rows('#sp-attendance', attendance.attendancePreview, (a) => `<div class="sp-row"><span>${time(a.attendanceDatePreview)}</span>${badge(a.statusPreview, statusClass(a.statusPreview))}${a.late ? badge('late', 'warn') : ''}</div>`);
  rows('#sp-shifts', shifts.shiftsPreview, (s) => `<div class="sp-row"><span>${esc(s.shiftNamePreview)}</span><span>${time(s.startTimePreview)}–${time(s.endTimePreview)}</span></div>`);

  if (leave && leave.ok) {
    const lb = leave.leaveBalancePreview || {};
    const pend = (leave.pendingRequestsPreview || []).map((p) => `<div class="sp-row"><span class="id">${esc(p.leaveIdPreview)}</span><span>${esc(p.leaveTypePreview)}</span>${badge(p.statusPreview, statusClass(p.statusPreview))}</div>`).join('');
    $('#sp-leave').innerHTML = `<div class="sp-row"><span>Annual</span><b>${esc(lb.annualLeavePreview)}</b></div><div class="sp-row"><span>Sick</span><b>${esc(lb.sickLeavePreview)}</b></div><div class="sp-row"><span>Casual</span><b>${esc(lb.casualLeavePreview)}</b></div>${pend}`;
  } else { $('#sp-leave').innerHTML = '<div class="sp-empty">No leave preview.</div>'; }

  $('#sp-payroll').innerHTML = payroll && payroll.ok
    ? `<div class="sp-row"><span>Period ${esc(payroll.payrollPeriodPreview)}</span>${badge(payroll.paymentStatusPreview, 'warn')}</div><div class="sp-row"><span>Salary</span>${badge('salary_masked', 'warn')}</div><div class="sp-row"><span>Bank</span><span class="id">${esc(payroll.bankRefMasked)}</span></div>`
    : '<div class="sp-empty">No payroll preview.</div>';

  rows('#sp-payslips', payslips.payslipsPreview, (p) => `<div class="sp-row"><span class="id">${esc(p.payslipIdPreview)}</span><span>${esc(p.periodPreview)}</span>${badge('metadata only', 'warn')}</div>`);

  $('#sp-commission').innerHTML = commission && commission.ok
    ? `<div class="sp-row"><span>Period ${esc(commission.commissionPeriodPreview)}</span>${badge(commission.payoutStatusPreview, statusClass(commission.payoutStatusPreview))}</div>`
    : '<div class="sp-empty">No commission preview.</div>';

  rows('#sp-expenses', expenses.expensesPreview, (e) => `<div class="sp-row"><span class="id">${esc(e.expenseIdPreview)}</span>${badge(e.approvalStatusPreview, statusClass(e.approvalStatusPreview))}${badge(e.paymentStatusPreview, statusClass(e.paymentStatusPreview))}</div>`);
  rows('#sp-tasks', tasks.assignedTasksPreview, (t) => `<div class="sp-row"><span class="id">${esc(t.taskIdPreview)}</span><span>${esc(t.titleSafe)}</span>${badge(t.statusPreview, statusClass(t.statusPreview))}${t.overdue ? badge('overdue', 'warn') : ''}</div>`);
  rows('#sp-sops', sops.sopChecklistsPreview, (s) => `<div class="sp-row"><span>${esc(s.titleSafe)}</span>${badge(s.statusPreview, statusClass(s.statusPreview))}</div>`);

  $('#sp-branch').innerHTML = branch && branch.ok
    ? `<div class="sp-row"><span>${esc(branch.branchSafe)} · ${esc(branch.roleSafe)}</span></div>`
    : '<div class="sp-empty">No branch preview.</div>';

  rows('#sp-approvals', approvals.pendingApprovalsPreview, (a) => `<div class="sp-row"><span class="id">${esc(a.approvalIdPreview)}</span><span>${esc(a.typeSafe)}</span>${badge(a.statusPreview, statusClass(a.statusPreview))}</div>`);
  rows('#sp-documents', documents.documentsPreview, (d) => `<div class="sp-row"><span class="id">${esc(d.documentIdPreview)}</span><span>${esc(d.nameSafe)}</span>${badge(d.statusPreview, statusClass(d.statusPreview))}</div>`);
  rows('#sp-contracts', contracts.contractsPreview, (c) => `<div class="sp-row"><span class="id">${esc(c.contractIdPreview)}</span><span>${esc(c.nameSafe)}</span>${badge(c.statusPreview, statusClass(c.statusPreview))}</div>`);
  rows('#sp-audit', audit.auditPreview, (a) => `<div class="sp-row"><span>${esc(a.action)}</span><span>${esc(a.staffMasked)}</span>${badge('preview', 'ok')}</div>`);
}

// Draft preview actions
const DRAFTS = {
  leave: () => api('/leave-request-preview', 'POST', { leaveType: 'annual', dates: ['2026-07-01', '2026-07-02'] }),
  expense: () => api('/expense-request-preview', 'POST', { category: 'travel', amount: 0, description: 'Travel expense preview.' }),
  hr: () => api('/hr-support-request-preview', 'POST', { subject: 'HR question', message: 'I have a question for HR.' }),
  message: () => api('/message-draft-preview', 'POST', { message: 'Hello, this is a preview message.' }),
  document: () => api('/document-request-preview', 'POST', { documentId: 'doc_1101' }),
};
$$('[data-draft]').forEach((b) => b.addEventListener('click', async () => {
  const out = $('#sp-draft-out');
  out.classList.add('show');
  out.textContent = 'Preparing safe preview…';
  const res = await DRAFTS[b.dataset.draft]();
  out.textContent = 'Safe preview (nothing was submitted, sent, or charged):\n\n' + JSON.stringify(res, null, 2);
}));

$('#sp-lookup-form').addEventListener('submit', (e) => { e.preventDefault(); loadAll(); });

(async function init() {
  await loadStatus();
  await loadAll();
})();
