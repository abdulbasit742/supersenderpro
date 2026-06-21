'use strict';


/* Privacy Center — front-end. Preview-only UI. No PII handled client-side. */

(function () {
  var API = '/api/privacy-center';
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x;
return e; }
  function getJSON(p) { return fetch(API + p).then(function (r) { return r.json(); }); }
  function postJSON(p, b) { return fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }


  var selected = null;

  function loadRequests() {
    return getJSON('/requests').then(function (r) {
      if (!r || !r.ok) return;
      var reqs = r.requests;
      $('ov-total').textContent = reqs.length;
      $('ov-new').textContent = reqs.filter(function (x) { return x.status === 'new'; }).length;
      $('ov-review').textContent = reqs.filter(function (x) { return x.status === 'in_review'; }).length;
      var tbody = $('req-table').querySelector('tbody'); tbody.innerHTML = '';
      if (!reqs.length) { var tr0 = el('tr'); var td0 = el('td', 'pc-muted', 'No requests.'); td0.colSpan = 4;
tr0.appendChild(td0); tbody.appendChild(tr0); return; }
      reqs.forEach(function (x) {
          var tr = el('tr', 'pc-row');
          tr.appendChild(el('td', null, x.requestType));
          tr.appendChild(el('td', null, x.requesterNameSafe || x.emailMasked || x.phoneMasked || '-'));

          tr.appendChild(el('td', null, x.status));
          tr.appendChild(el('td', null, x.dueAt ? new Date(x.dueAt).toLocaleDateString() : '-'));
          tr.onclick = function () { selectReq(x.id); };
        tbody.appendChild(tr);
      });
    });
}


function selectReq(id) {
    selected = id;
    getJSON('/requests/' + id).then(function (r) {
      if (!r || !r.ok) return;
      var x = r.request, b = $('detail-body'); b.innerHTML = '';
    [['Type', x.requestType], ['Requester', x.requesterNameSafe], ['Phone', x.phoneMasked], ['Email', x.emailMasked],
['Tenant', x.tenantId], ['Status', x.status], ['Priority', x.priority], ['Due', x.dueAt], ['Notes',
x.notesPreview]].forEach(function (row) { var p = el('p'); p.appendChild(el('span', 'pc-key', row[0] + ': '));
p.appendChild(document.createTextNode(String(row[1] == null ? '-' : row[1]))); b.appendChild(p); });
      var act = $('detail-actions'); act.innerHTML = '';
      var be = el('button', 'pc-btn pc-btn-tiny', 'Export preview'); be.onclick = function () { postJSON('/requests/' +
id + '/export-preview', {}).then(function (r) { $('export-out').textContent = JSON.stringify(r, null, 2); }); };
    var bd = el('button', 'pc-btn pc-btn-tiny pc-btn-ghost', 'Deletion preview'); bd.onclick = function () {
postJSON('/requests/' + id + '/delete-preview', {}).then(function (r) { $('delete-out').textContent = JSON.stringify(r,
null, 2); }); };
      act.appendChild(be); act.appendChild(bd);
    });
}

function loadRetention() {
  return getJSON('/retention-policies').then(function (r) {
      if (!r || !r.ok) return;
      $('ov-policies').textContent = r.policies.length;
      var box = $('retention-body'); box.innerHTML = '';
      var ul = el('ul', 'pc-list');
      r.policies.forEach(function (p) {
        var li = el('li', null, p.name + ' — ' + p.dataType + ' · ' + p.retentionDays + 'd · ' + p.action);
      var b = el('button', 'pc-btn pc-btn-tiny', 'preview'); b.onclick = function () { postJSON('/retention-policies/'
+ p.id + '/run-preview', {}).then(function (r) { $('audit-out').textContent = JSON.stringify(r, null, 2); }); };
        li.appendChild(document.createTextNode(' ')); li.appendChild(b); ul.appendChild(li);
      });
      box.appendChild(ul);
    });
}

function loadConsent() { return getJSON('/consent-records').then(function (r) { $('consent-out').textContent =
JSON.stringify(r, null, 2); }); }
function auditExport() { postJSON('/audit-export-preview', { limit: 50 }).then(function (r) { $('audit-out').textContent = JSON.stringify(r, null, 2); }); }
function checklist() { getJSON('/compliance-checklist').then(function (r) { $('audit-out').textContent =
JSON.stringify(r, null, 2); }); }


function newRequest() {
  var type = prompt('Request type? (data_access, data_export, data_deletion, consent_review, opt_out, correction, audit_export)', 'data_export'); if (!type) return;
    var name = prompt('Requester name?') || 'Demo User';
    postJSON('/requests', { requestType: type, requesterName: name }).then(function () { loadRequests(); });
}

  function bind() { $('btn-new-request').onclick = newRequest; $('btn-refresh').onclick = function () { loadRequests();
loadRetention(); loadConsent(); }; $('btn-audit').onclick = auditExport; $('btn-checklist').onclick = checklist; }
  function init() { bind(); loadRequests(); loadRetention(); loadConsent(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
