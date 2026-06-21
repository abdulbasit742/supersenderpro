 'use strict';

 /* Incident Command — front-end. Read-only + dry-run UI. No secrets handled client-side. */


 (function () {
   var API = '/api/incident-command';
   function $(id) { return document.getElementById(id); }
   function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x;
 return e; }
   function getJSON(p) { return fetch(API + p).then(function (r) { return r.json(); }); }
   function postJSON(p, b) { return fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }

   function setBadge(node, label, on) { node.textContent = label; node.classList.remove('icc-badge-on', 'icc-badge-off');
 node.classList.add(on ? 'icc-badge-on' : 'icc-badge-off'); }
   var statusClass = { healthy: 'icc-ok', warning: 'icc-warn', degraded: 'icc-warn', failing: 'icc-crit', blocked: 'icc-crit', unavailable: 'icc-muted', unknown: 'icc-muted' };

   function loadStatus() {
       return getJSON('/status').then(function (s) {
         if (!s || !s.ok) return;
         setBadge($('badge-dryrun'), 'dry-run: ' + (s.dryRun ? 'on' : 'off'), s.dryRun);
         setBadge($('badge-livealerts'), 'live-alerts: ' + (s.liveAlerts ? 'on' : 'off'), !s.liveAlerts);
         setBadge($('badge-autofix'), 'auto-fix: ' + (s.autoFix ? 'on' : 'off'), !s.autoFix);
       });
   }


   function renderModules(records) {
     var grid = $('module-grid'); grid.innerHTML = '';
       if (!records || !records.length) { grid.appendChild(el('div', 'icc-muted', 'No health data. Run a scan.')); return; }
       records.forEach(function (r) {
         var card = el('div', 'icc-modcard');
         var dot = el('span', 'icc-dot ' + (statusClass[r.status] || 'icc-muted'));
       var title = el('div', 'icc-modtitle'); title.appendChild(dot); title.appendChild(document.createTextNode(' ' +
 r.moduleName));
         card.appendChild(title);
         card.appendChild(el('div', 'icc-modstatus', r.status + ' · ' + r.severity));
         card.appendChild(el('div', 'icc-modsummary', r.summary || ''));
         grid.appendChild(card);
       });
   }

   function loadOverview(run) {
       var counts = run.counts || {};
       $('ov-score').textContent = (run.score != null ? run.score : '--');
       $('ov-healthy').textContent = counts.healthy || 0;
       $('ov-degraded').textContent = counts.degraded || 0;

    $('ov-scan').textContent = run.ranAt ? new Date(run.ranAt).toLocaleTimeString() : '--';
}

function runHealth() {
  return postJSON('/health/run', {}).then(function (run) {
      if (!run || !run.ok) return;
      loadOverview(run);
      renderModules(run.records);
    });
}

function runDoctor() {
  return postJSON('/doctor/run', { persist: true }).then(function (d) {
      $('doctor-output').textContent = JSON.stringify(d, null, 2);
      var crit = 0, warn = 0;
    (d.detection && d.detection.candidates || []).forEach(function (c) { if (c.severity === 'critical' || c.severity
=== 'high') crit++; else warn++; });
      $('ov-critical').textContent = crit; $('ov-warnings').textContent = warn;
      loadIncidents();
    });
}

function loadIncidents() {
    var qs = [];
    if ($('f-sev').value) qs.push('severity=' + $('f-sev').value);
    if ($('f-state').value) qs.push('state=' + $('f-state').value);
    if ($('f-mod').value) qs.push('moduleId=' + encodeURIComponent($('f-mod').value));
    return getJSON('/incidents' + (qs.length ? '?' + qs.join('&') : '')).then(function (r) {
      if (!r || !r.ok) return;
      var tbody = $('inc-table').querySelector('tbody'); tbody.innerHTML = '';
      if (!r.incidents.length) { var tr0 = el('tr'); var td0 = el('td', 'icc-muted', 'No incidents.'); td0.colSpan = 5;
tr0.appendChild(td0); tbody.appendChild(tr0); return; }
    r.incidents.forEach(function (i) {
          var tr = el('tr');
          tr.appendChild(el('td', statusClass[i.status] || '', i.severity));
          tr.appendChild(el('td', null, i.moduleName || i.moduleId || '-'));
          tr.appendChild(el('td', null, i.summary || '-'));
          tr.appendChild(el('td', null, i.state));
          var act = el('td');
          ['ack', 'resolve', 'snooze'].forEach(function (a) {
            var b = el('button', 'icc-btn icc-btn-tiny', a);
        b.onclick = function (e) { e.stopPropagation(); postJSON('/incidents/' + i.id + '/' + a, a === 'snooze' ? {
minutes: 60 } : {}).then(loadIncidents); };
            act.appendChild(b);
          });
          tr.appendChild(act);
          tr.onclick = function () { loadRunbook(i.id); };
        tbody.appendChild(tr);
      });
    });
}


function loadRunbook(incId) {
    getJSON('/incidents/' + incId).then(function (r) {
      if (!r || !r.ok) return;
      var rec = r.recovery || {};
      var box = $('runbook-body'); box.innerHTML = '';

      box.appendChild(el('h4', null, rec.title || 'Runbook'));
    function section(label, arr) { if (!arr || !arr.length) return; box.appendChild(el('div', 'icc-key', label)); var
ul = el('ul', 'icc-list'); arr.forEach(function (s) { ul.appendChild(el('li', null, s)); }); box.appendChild(ul); }
    section('Symptoms', rec.symptoms); section('Likely causes', rec.likelyCauses); section('Safe checks',
rec.safeChecks); section('Manual fix steps', rec.manualFixSteps);
      box.appendChild(el('p', 'icc-muted', rec.dryRunAutoFix ? rec.dryRunAutoFix.wouldDo : 'No auto-fix.'));
    });
}

function loadAlerts() {
  return getJSON('/alerts').then(function (r) {
      if (!r || !r.ok) return;
      var ul = $('alert-list'); ul.innerHTML = '';
      if (!r.rules.length) { ul.appendChild(el('li', 'icc-muted', 'No rules.')); return; }
      r.rules.forEach(function (a) { ul.appendChild(el('li', null, a.name + ' [' + a.condition + ' → ' +
a.channels.join(',') + ', cd ' + a.cooldownMinutes + 'm]')); });
  });
}


function addAlert() {
  postJSON('/alerts', { name: $('al-name').value, condition: $('al-cond').value, channels: [$('al-out').value],
cooldownMinutes: parseInt($('al-cooldown').value, 10) || 30 }).then(loadAlerts);
}
function testAlert() { postJSON('/alerts/test', { outputType: $('al-out').value }).then(function (r) { $('doctor-output').textContent = JSON.stringify(r, null, 2); }); }
function genReport() { postJSON('/report/generate', {}).then(function (r) { $('doctor-output').textContent = r &&
r.markdown ? r.markdown : JSON.stringify(r, null, 2); }); }


function bind() {
    $('btn-run-health').onclick = runHealth;
    $('btn-run-doctor').onclick = runDoctor;
    $('btn-gen-report').onclick = genReport;
    $('btn-filter').onclick = loadIncidents;
    $('btn-add-alert').onclick = addAlert;
    $('btn-test-alert').onclick = testAlert;
}


function init() { bind(); loadStatus(); runHealth(); loadIncidents(); loadAlerts(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
