'use strict';


/* Pilot Ops — front-end. Read-only + dry-run UI. No PII handled client-side. */

(function () {
  var API = '/api/pilot-ops';
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x;
return e; }
  function getJSON(p) { return fetch(API + p).then(function (r) { return r.json(); }); }
  function postJSON(p, b) { return fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }
  function setBadge(n, label, on) { n.textContent = label; n.classList.remove('po-badge-on', 'po-badge-off');
n.classList.add(on ? 'po-badge-on' : 'po-badge-off'); }

  var selectedId = null;


  function loadStatus() {
    return getJSON('/status').then(function (s) {
        if (!s || !s.ok) return;
        setBadge($('badge-dryrun'), 'dry-run: ' + (s.dryRun ? 'on' : 'off'), s.dryRun);
        setBadge($('badge-consent'), 'consent-required: ' + (s.requireConsent ? 'yes' : 'no'), s.requireConsent);
        setBadge($('badge-live'), 'live-messages: ' + (s.liveMessages ? 'on' : 'off'), !s.liveMessages);
      });
  }

  function loadDashboard() {
      return getJSON('/dashboard').then(function (d) {
        if (!d || !d.ok) return;
        var t = d.totals;
        $('ov-pilots').textContent = t.pilots; $('ov-trials').textContent = t.activeTrials; $('ov-stuck').textContent =
t.onboardingStuck;
      $('ov-upgrade').textContent = t.upgradeReady; $('ov-risk').textContent = t.highRisk; $('ov-feedback').textContent =
t.feedbackOpen; $('ov-expiring').textContent = t.trialExpiring;
    });
  }


  function loadPilots() {
    return getJSON('/pilots').then(function (r) {
        if (!r || !r.ok) return;
        var tbody = $('pilot-table').querySelector('tbody'); tbody.innerHTML = '';
      if (!r.pilots.length) { var tr0 = el('tr'); var td0 = el('td', 'po-muted', 'No pilots yet. Create one.');
td0.colSpan = 8; tr0.appendChild(td0); tbody.appendChild(tr0); return; }
        r.pilots.forEach(function (p) {
          var tr = el('tr', 'po-row');
            tr.appendChild(el('td', null, p.businessName));
            tr.appendChild(el('td', null, p.businessType || '-'));

          tr.appendChild(el('td', null, p.selectedPlan || '-'));
          tr.appendChild(el('td', null, p.onboardingStatus));
          tr.appendChild(el('td', null, p.trialStatus));
          tr.appendChild(el('td', 'po-ok', String(p.successScore)));
          tr.appendChild(el('td', (p.riskScore >= 60 ? 'po-bad' : ''), String(p.riskScore)));
          tr.appendChild(el('td', null, p.nextAction || '-'));
          tr.onclick = function () { selectPilot(p.id); };
        tbody.appendChild(tr);
      });
    });
}

function selectPilot(id) {
    selectedId = id;
    getJSON('/pilots/' + id).then(function (r) {
      if (!r || !r.ok) return;
      var p = r.pilot, body = $('detail-body'); body.innerHTML = '';
    [['Business', p.businessName], ['Type', p.businessType], ['Owner', p.ownerNameSafe], ['Phone', p.ownerPhoneMasked],
['Email', p.ownerEmailMasked], ['Plan', p.selectedPlan], ['Preset', p.selectedPreset], ['Modules', (p.requestedModules ||
[]).join(', ')], ['Onboarding', p.onboardingStatus], ['Trial', p.trialStatus]].forEach(function (row) {
      var pp = el('p'); pp.appendChild(el('span', 'po-key', row[0] + ': '));
pp.appendChild(document.createTextNode(String(row[1] == null ? '-' : row[1]))); body.appendChild(pp);
    });
      var act = $('detail-actions'); act.innerHTML = '';
      var bStart = el('button', 'po-btn po-btn-tiny', 'Start onboarding'); bStart.onclick = function () {
postJSON('/pilots/' + id + '/start-onboarding', {}).then(function () { selectPilot(id); loadChecklist(id); loadPilots();
}); };
    var bScore = el('button', 'po-btn po-btn-tiny po-btn-ghost', 'Run scores'); bScore.onclick = function () {
postJSON('/pilots/' + id + '/scores/run', { signals: {} }).then(function () { selectPilot(id); loadScores(id);
loadPilots(); }); };
    var bConv = el('button', 'po-btn po-btn-tiny po-btn-ghost', 'Conversion preview'); bConv.onclick = function () {
postJSON('/pilots/' + id + '/conversion-preview', { signals: {} }).then(function (c) { $('scores-body').textContent =
JSON.stringify(c, null, 2); }); };
      act.appendChild(bStart); act.appendChild(bScore); act.appendChild(bConv);
      loadChecklist(id); loadScores(id);
    });
}


function loadChecklist(id) {
    getJSON('/pilots/' + id + '/checklist').then(function (r) {
      if (!r || !r.ok) return;
      var box = $('checklist-body'); box.innerHTML = '';
      if (!r.checklist.length) { box.appendChild(el('p', 'po-muted', 'No checklist. Start onboarding.')); return; }
    box.appendChild(el('p', 'po-key', 'Progress: ' + r.progress.percent + '% (' + r.progress.completed + '/' +
r.progress.total + ')'));
      var ul = el('ul', 'po-list');
      r.checklist.forEach(function (it) {
          var li = el('li', null, it.title + ' — ' + it.status + (it.required ? ' *' : ''));
          var b = el('button', 'po-btn po-btn-tiny', 'done'); b.onclick = function () { postJSON('/pilots/' + id +
'/checklist/' + it.id + '/mark', { status: 'completed' }).then(function () { loadChecklist(id); loadPilots(); }); };
      li.appendChild(document.createTextNode(' ')); li.appendChild(b); ul.appendChild(li);
      });
      box.appendChild(ul);
    });
}

function loadScores(id) {

      getJSON('/pilots/' + id + '/scores').then(function (r) { if (!r || !r.ok) return; $('scores-body').textContent =
'Success: ' + r.successScore + ' | Risk: ' + r.riskScore; });
  }


  function loadFeedback() {
      return getJSON('/feedback').then(function (r) {
        if (!r || !r.ok) return;
       var tbody = $('fb-table').querySelector('tbody'); tbody.innerHTML = '';
       if (!r.items.length) { var tr0 = el('tr'); var td0 = el('td', 'po-muted', 'No feedback.'); td0.colSpan = 5;
tr0.appendChild(td0); tbody.appendChild(tr0); return; }
      r.items.forEach(function (f) {
          var tr = el('tr');
          [f.type, f.title, f.severity, f.relatedModule || '-', f.status].forEach(function (v) { tr.appendChild(el('td',
null, String(v))); });
        tbody.appendChild(tr);
        });
      });
  }


  function genFollowup() {
    if (!selectedId) { $('fu-output').textContent = 'Select a pilot first.'; return; }
    postJSON('/pilots/' + selectedId + '/followup-draft', { draftType: $('fu-type').value, language: $('fu-lang').value
}).then(function (r) { $('fu-output').textContent = JSON.stringify(r, null, 2); });
  }


  function newPilot() {
    var name = prompt('Business name?'); if (!name) return;
      postJSON('/pilots', { businessName: name }).then(function () { loadPilots(); loadDashboard(); });
  }


  function bind() {
      $('btn-new-pilot').onclick = newPilot;
      $('btn-refresh').onclick = function () { loadDashboard(); loadPilots(); loadFeedback(); };
      $('btn-followup').onclick = genFollowup;
  }

  function init() { bind(); loadStatus(); loadDashboard(); loadPilots(); loadFeedback(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
