'use strict';


/* SaaS Billing — front-end. Preview-only UI. */

(function () {

var API = '/api/saas-billing';
function $(id) { return document.getElementById(id); }
function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x;
return e; }
function getJSON(p) { return fetch(API + p).then(function (r) { return r.json(); }); }
function postJSON(p, b) { return fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }


function fillMeterSelects(meters) {
  ['q-meter', 'r-meter'].forEach(function (id) { var sel = $(id); sel.innerHTML = ''; meters.forEach(function (m) { var
o = el('option', null, m); o.value = m; sel.appendChild(o); }); });
}

function loadStatus() { return getJSON('/status').then(function (s) { if (!s || !s.ok) return;
fillMeterSelects(s.meters); var u = $('u-target'); u.innerHTML = ''; s.plans.forEach(function (p) { var o = el('option',
null, p); o.value = p; u.appendChild(o); }); }); }

function loadPlans() {
  return getJSON('/plans').then(function (r) {
     if (!r || !r.ok) return;
     var box = $('plan-cards'); box.innerHTML = '';
     r.plans.forEach(function (p) {
       var card = el('div', 'sb-plan');
        card.appendChild(el('div', 'sb-plan-name', p.name));
        card.appendChild(el('div', 'sb-plan-price', p.currency + ' ' + p.pricePreview + '/' + p.billingCycle));
        card.appendChild(el('div', 'sb-muted', (p.features || []).slice(0, 4).join(', ')));
        box.appendChild(card);
      });
    });
}


function loadSummary() {
  return getJSON('/summary').then(function (s) {
     if (!s || !s.ok) return;
     $('ov-plan').textContent = s.plan ? s.plan.name : '--';
     $('ov-status').textContent = (s.status || '').replace('_preview', '');
     $('ov-near').textContent = (s.nearLimit || []).length;
     $('ov-over').textContent = (s.overLimit || []).length;
     var box = $('meters-body'); box.innerHTML = '';
     (s.meters || []).forEach(function (m) {
       var row = el('div', 'sb-meter');
        row.appendChild(el('span', 'sb-meter-name', m.meter));
        var barWrap = el('div', 'sb-bar'); var bar = el('div', 'sb-bar-fill' + (m.overLimit ? ' sb-bar-over' :
(m.percentUsed >= 80 ? ' sb-bar-near' : ''))); bar.style.width = Math.min(100, m.percentUsed) + '%';
barWrap.appendChild(bar);
        row.appendChild(barWrap);
        row.appendChild(el('span', 'sb-meter-val', m.unlimited ? (m.used + ' / unlimited') : (m.used + ' / ' +
m.limit)));
      box.appendChild(row);
      });
    });
}

function loadEvents() {
  return getJSON('/usage-events?limit=50').then(function (r) {
     if (!r || !r.ok) return;
     var tbody = $('events-table').querySelector('tbody'); tbody.innerHTML = '';

      if (!r.events.length) { var tr0 = el('tr'); var td0 = el('td', 'sb-muted', 'No events.'); td0.colSpan = 4;
tr0.appendChild(td0); tbody.appendChild(tr0); return; }
      r.events.forEach(function (e) { var tr = el('tr'); [new Date(e.at).toLocaleTimeString(), e.tenantId, e.meter,
e.amount].forEach(function (v) { tr.appendChild(el('td', null, String(v))); }); tbody.appendChild(tr); });
    });
  }


  function bind() {
    $('btn-refresh').onclick = function () { loadPlans(); loadSummary(); loadEvents(); };
    $('btn-admin').onclick = function () { getJSON('/summary?admin=true').then(function (r) { $('admin-out').textContent
= JSON.stringify(r, null, 2); }); };
    $('btn-quota').onclick = function () { postJSON('/quota/check-preview', { meter: $('q-meter').value, requested:
Number($('q-req').value) || 0 }).then(function (r) { $('quota-out').textContent = JSON.stringify(r, null, 2); }); };
    $('btn-ent').onclick = function () { postJSON('/entitlements/check-preview', { feature: $('e-feature').value
}).then(function (r) { $('ent-out').textContent = JSON.stringify(r, null, 2); }); };
    $('btn-upgrade').onclick = function () { postJSON('/upgrade-preview', { targetPlan: $('u-target').value
}).then(function (r) { $('upgrade-out').textContent = JSON.stringify(r, null, 2); }); };
    $('btn-record').onclick = function () { postJSON('/usage/record-preview', { meter: $('r-meter').value, amount:
Number($('r-amt').value) || 1 }).then(function (r) { $('record-out').textContent = JSON.stringify(r, null, 2);
loadSummary(); loadEvents(); }); };
  }


  function init() { bind(); loadStatus().then(function () { loadPlans(); loadSummary(); loadEvents(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
