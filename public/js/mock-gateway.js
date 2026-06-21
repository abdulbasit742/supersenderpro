'use strict';


/* Mock Gateway — front-end. Offline preview UI. No secrets handled client-side. */

(function () {
 var API = '/api/mock-gateway';
 function $(id) { return document.getElementById(id); }
 function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x;
return e; }
 function getJSON(p) { return fetch(API + p).then(function (r) { return r.json(); }); }
 function postJSON(p, b) { return fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }
 function setBadge(n, label, on) { n.textContent = label; n.classList.remove('mg-badge-on', 'mg-badge-off');
n.classList.add(on ? 'mg-badge-on' : 'mg-badge-off'); }

 function loadStatus() {
   return getJSON('/status').then(function (s) {
       if (!s || !s.ok) return;
       setBadge($('badge-offline'), 'offline-only: ' + (s.offlineOnly ? 'yes' : 'no'), s.offlineOnly);
       setBadge($('badge-dryrun'), 'dry-run: ' + (s.dryRun ? 'on' : 'off'), s.dryRun);
       setBadge($('badge-external'), 'external-calls: ' + (s.externalCallsEnabled ? 'on' : 'off'),
!s.externalCallsEnabled);
     setBadge($('badge-live'), 'live-actions: ' + (s.liveActionsEnabled ? 'on' : 'off'), !s.liveActionsEnabled);
     });
 }

 function loadProviders() {
     return getJSON('/providers').then(function (r) {
       if (!r || !r.ok) return;
       var grid = $('provider-grid'); grid.innerHTML = '';
       r.providers.forEach(function (p) {
           var card = el('div', 'mg-provcard');
           card.appendChild(el('div', 'mg-provtitle', p.name.replace(/Mock$/, '')));
           var st = p.status || {};
           card.appendChild(el('div', 'mg-provstatus', (st.available ? 'available' : 'unavailable') + ' · mock'));
           var b = el('button', 'mg-btn mg-btn-tiny', 'preview'); b.onclick = function () { runProvider(p.name); };
           card.appendChild(b);
         grid.appendChild(card);
       });
     });
 }

 function loadScenarios() {
     return getJSON('/scenarios').then(function (r) {
       if (!r || !r.ok) return;
       var sel = $('scenario-select'); sel.innerHTML = '';
       r.scenarios.forEach(function (s) { var o = el('option', null, s.title); o.value = s.id; sel.appendChild(o); });

     });
 }

 function runScenario() { postJSON('/run', { scenarioId: $('scenario-select').value }).then(function (r) { $('scenario-out').textContent = JSON.stringify(r, null, 2); loadEvents(); }); }
 function runProvider(name) { postJSON('/run/' + name, { input: {} }).then(function (r) { $('scenario-out').textContent
= JSON.stringify(r, null, 2); loadEvents(); }); }
 function sanitize() { var raw = $('sanitize-input').value.trim(); var payload; try { payload = raw.charAt(0) === '{' ?
JSON.parse(raw) : raw; } catch (e) { payload = raw; } postJSON('/sanitize', { payload: payload }).then(function (r) {
$('sanitize-out').textContent = JSON.stringify(r, null, 2); }); }

 function loadEvents() {
   return getJSON('/events?limit=50').then(function (r) {
       if (!r || !r.ok) return;
       var tbody = $('events-table').querySelector('tbody'); tbody.innerHTML = '';
     if (!r.events.length) { var tr0 = el('tr'); var td0 = el('td', 'mg-muted', 'No events yet.'); td0.colSpan = 5;
tr0.appendChild(td0); tbody.appendChild(tr0); return; }
       r.events.forEach(function (e) {
         var tr = el('tr');
           tr.appendChild(el('td', null, new Date(e.at).toLocaleTimeString()));
           tr.appendChild(el('td', null, e.provider || '-'));
           tr.appendChild(el('td', null, e.action || '-'));
           tr.appendChild(el('td', null, e.status || '-'));
           tr.appendChild(el('td', null, (e.warnings || []).join('; ')));
           tbody.appendChild(tr);
       });
     });
 }


 function runDoctor() { postJSON('/report/generate', {}).then(function (r) { $('doctor-out').textContent =
JSON.stringify(r.doctor || r, null, 2); }); }

 function bind() {
     $('btn-doctor').onclick = runDoctor;
     $('btn-refresh').onclick = loadProviders;
     $('btn-run-scenario').onclick = runScenario;
     $('btn-sanitize').onclick = sanitize;
 }

 function init() { bind(); loadStatus(); loadProviders(); loadScenarios(); loadEvents(); }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
