// public/js/staff-portal.js — Staff Portal client. Preview-only: never submits, pays, downloads, sends, or mutates.
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
const badge = (t, cls = '') => `<span class="badge ${cls}">${esc(t)}</span>`;
function statusClass(s) {
  s = String(s || '');
  if (/present|active|scheduled|available|done|approved|complete/.test(s)) return 'ok';
  if (/pending|incomplete|processing|accruing|in_progress|missing|late|expiring/.test(s)) return 'warn';
  if (/absent|block|expired|reject|cancel/.test(s)) return 'bad';
  return '';
}
function rows(el, items, fn) {
  const node = $(el);
  if (!items || !items.length) { node.innerHTML = '<div class="sp-empty">Nothing to show in this preview.</div>'; return; }
  node.innerHTML = items.map(fn).join('');
}

function renderSafetyBadges() {
  const items = ['Safe preview', 'No payroll change', 'No live submit', 'No live sends', 'PII / salary masked', 'External calls off'];
  $('#sp-safety-badges').innerHTML = items.map((k) => `<span class="sp-badge">✓ ${esc(k)}</span>`).join('');
}

async function loadAll() {
  const lookup = await api('/lookup-preview', 'POST', { mode: $('#sp-mode').value, reference: $('#sp-ref').value });
  if (lookup && lookup.ok) {
    $('#sp-error').hidden = true;
    $('#sp-profile').innerHTML = `<div class="row"><b>${esc(lookup.staffNameSafe)}</b> · ${esc(lookup.phoneMasked)} · ${esc(lookup.emailMasked)} · token ${esc(lookup.portalTokenPreview)}</div>`;
  } else {
    $('#sp-error').hidden = false;
    $('#sp-error').textContent = 'We could not load this preview right now. Please try again or contact HR.';
  }

  const sum = await api('/summary');
  if (sum && sum.ok) {
    const kpis = [
      ['Leave balance', sum.leaveBalancePreview], ['Open tasks', sum.openTasksPreview],
      ['Pending expenses', sum.pendingExpensesPreview], ['Pending approvals', sum.pendingApprovalsPreview],
      ['Incomplete SOPs', sum.incompleteSopsPreview],
    ];
    $('#sp-kpis').innerHTML = kpis.map(([k, v]) => `<div class="sp-kpi"><div class="k">${esc(k)}</div><div class="v">${v ?? '-'}</div></div>`).join('');
  }

  const [att, shifts, leave, payroll, payslips, commission, expenses, tasks, sops, branch, approvals, documents, contracts] = await Promise.all([
    api('/attendance'), api('/shifts'), api('/leave'), api('/payroll'), api('/payslips'), api('/commission'),
    api('/expenses'), api('/tasks'), api('/sops'), api('/branch-assignment'), api('/approvals'), api('/documents'), api('/contracts'),
  ]);

  $('#sp-attendance').innerHTML = `<div class="sp-row"><span>Today</span>${badge(att.todayStatusPreview, statusClass(att.todayStatusPreview))}</div>
    <div class="sp-row"><span>This month</span><span>P:${att.monthPresentPreview} · A:${att.monthAbsentPreview} · Late:${att.monthLatePreview}</span></div>`;
  rows('#sp-shifts', shifts.shiftsPreview, (s) => `<div class="sp-row"><span>${esc(s.daySafe)} · ${esc(s.timeSafe)}</span>${badge(s.statusPreview, statusClass(s.statusPreview))}</div>`);
  $('#sp-leave').innerHTML = `<div class="sp-row"><span>Annual balance</span><b>${leave.annualBalancePreview}</b></div>
    <div class="sp-row"><span>Sick balance</span><b>${leave.sickBalancePreview}</b></div>
    <div class="sp-row"><span>Pending requests</span>${badge(leave.pendingRequestsPreview, leave.pendingRequestsPreview ? 'warn' : 'ok')}</div>`;
  $('#sp-payroll').innerHTML = `<div class="sp-row"><span>${esc(payroll.periodSafe)}</span>${badge(payroll.statusPreview, statusClass(payroll.statusPreview))}</div>
    <div class="sp-row"><span>Net</span><span class="id">${esc(payroll.netAmountPreview)}</span></div>
    ${(payslips.payslipsPreview || []).map((p) => `<div class="sp-row"><span>${esc(p.periodSafe)}</span>${badge(p.statusPreview, statusClass(p.statusPreview))}</div>`).join('')}`;
  $('#sp-commission').innerHTML = `<div class="sp-row"><span>${esc(commission.periodSafe)} · Deals: ${commission.dealsClosedPreview}</span><span class="id">${esc(commission.earnedPreview)}</span></div>`;
  rows('#sp-expenses', expenses.expensesPreview, (e) => `<div class="sp-row"><span class="id">${esc(e.expenseIdPreview)}</span><span>${esc(e.typeSafe)}</span>${badge(e.statusPreview, statusClass(e.statusPreview))}</div>`);
  rows('#sp-tasks', tasks.tasksPreview, (t) => `<div class="sp-row"><span>${esc(t.titleSafe)}</span>${badge(t.statusPreview, statusClass(t.statusPreview))}</div>`);
  rows('#sp-sops', sops.sopsPreview, (s) => `<div class="sp-row"><span>${esc(s.nameSafe)} (${esc(s.progressPreview)})</span>${badge(s.statusPreview, statusClass(s.statusPreview))}</div>`);
  $('#sp-branch').innerHTML = `<div class="sp-row"><span>${esc(branch.branchSafe)}</span><span>${esc(branch.shiftPatternSafe)}</span></div><div class="sp-row"><span>Manager</span><span>${esc(branch.managerSafe)}</span></div>`;
  rows('#sp-approvals', approvals.approvalsPreview, (a) => `<div class="sp-row"><span>${esc(a.typeSafe)}</span>${badge(a.statusPreview, statusClass(a.statusPreview))}</div>`);
  const docRows = (documents.documentsPreview || []).map((d) => `<div class="sp-row"><span class="id">${esc(d.documentIdPreview)}</span><span>${esc(d.nameSafe)}</span>${badge(d.statusPreview, statusClass(d.statusPreview))}</div>`);
  const conRows = (contracts.contractsPreview || []).map((c) => `<div class="sp-row"><span>${esc(c.nameSafe)}</span>${badge(c.statusPreview, statusClass(c.statusPreview))}</div>`);
  $('#sp-documents').innerHTML = (docRows.concat(conRows).join('')) || '<div class="sp-empty">Nothing to show.</div>';
}

const DRAFTS = {
  leave: () => api('/leave-request-preview', 'POST', { type: 'annual', from: 'Next Mon', to: 'Next Wed', reason: 'Personal' }),
  expense: () => api('/expense-request-preview', 'POST', { type: 'Travel', amount: 1000, note: 'Client visit' }),
  hr: () => api('/hr-support-request-preview', 'POST', { subject: 'Question', message: 'I have an HR question.' }),
  message: () => api('/message-draft-preview', 'POST', { message: 'Hello team, this is a preview.' }),
  document: () => api('/document-request-preview', 'POST', { documentId: 'doc_8001' }),
};
$$('[data-draft]').forEach((b) => b.addEventListener('click', async () => {
  const out = $('#sp-draft-out');
  out.classList.add('show');
  out.textContent = 'Preparing safe preview…';
  const res = await DRAFTS[b.dataset.draft]();
  out.textContent = 'Safe preview (nothing was submitted, sent, or paid):\n\n' + JSON.stringify(res, null, 2);
}));

$('#sp-lookup-form').addEventListener('submit', (e) => { e.preventDefault(); loadAll(); });

(async function init() {
  const status = await api('/status');
  renderSafetyBadges();
  await loadAll();
})();
