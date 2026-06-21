'use strict';

/* No-Code Flows — front-end. Preview-only UI. */


(function () {
  var API = '/api/no-code-flows';
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x;
return e; }
  function getJSON(p) { return fetch(API + p).then(function (r) { return r.json(); }); }
  function postJSON(p, b) { return fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }
  function putJSON(p, b) { return fetch(API + p, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body:
JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }

  var selected = null;


  function loadFlows() {
    return getJSON('/flows').then(function (r) {
       if (!r || !r.ok) return;
       var box = $('flow-list'); box.innerHTML = '';
       if (!r.flows.length) { box.appendChild(el('span', 'nf-muted', 'No flows yet.')); return; }
       r.flows.forEach(function (f) {
          var row = el('div', 'nf-row');
          row.appendChild(el('strong', null, f.name));
          row.appendChild(el('span', 'nf-tag', f.status));
          row.appendChild(el('span', 'nf-tag', (f.nodes || []).length + ' nodes'));
          row.onclick = function () { selectFlow(f.id); };
          box.appendChild(row);
        });
      });
  }

  function selectFlow(id) {

    selected = id;
    getJSON('/flows/' + id).then(function (r) {
      if (!r || !r.ok) return;
      var f = r.flow, box = $('flow-editor'); box.innerHTML = '';
      box.appendChild(el('p', 'nf-key', f.name));
      box.appendChild(el('p', null, 'Trigger: ' + (f.trigger ? f.trigger.type : 'none')));
      var ul = el('ul', 'nf-list');
      (f.nodes || []).forEach(function (n) { ul.appendChild(el('li', null, n.type + (n.label ? ' — ' + n.label : '')));
});
      box.appendChild(ul);
      var bV = el('button', 'nf-btn nf-btn-tiny', 'Validate'); bV.onclick = function () { postJSON('/flows/' + id +
'/validate', {}).then(function (v) { $('validation-out').textContent = JSON.stringify(v, null, 2); }); };
    box.appendChild(bV);
    });
}


function loadPalette() {
    return getJSON('/node-registry').then(function (r) {
      if (!r || !r.ok) return;
    var t = $('palette-triggers'); t.innerHTML = ''; r.triggers.forEach(function (n) { t.appendChild(el('span', 'nf-chip', n.label)); });
    var a = $('palette-actions'); a.innerHTML = ''; r.actions.forEach(function (n) { a.appendChild(el('span', 'nf-chip', n.label)); });
    });
}

function preview() { if (!selected) { $('preview-out').textContent = 'Select a flow first.'; return; }
postJSON('/flows/' + selected + '/preview-run', {}).then(function (r) { $('preview-out').textContent = JSON.stringify(r,
null, 2); }); }


function loadCampaigns() {
    return getJSON('/campaigns').then(function (r) {
      if (!r || !r.ok) return;
      var box = $('campaign-cards'); box.innerHTML = '';
      r.campaigns.forEach(function (c) {
          var card = el('div', 'nf-stat');
          card.appendChild(el('div', 'nf-stat-name', c.name));
          card.appendChild(el('div', 'nf-muted', 'audience ' + c.audience));
          var b = el('button', 'nf-btn nf-btn-tiny', 'analytics'); b.onclick = function () { showCampaign(c.campaignId); };
          card.appendChild(b);
          box.appendChild(card);
      });
    });
}


function showCampaign(id) {
  getJSON('/campaigns/' + id + '/analytics').then(function (a) {
      getJSON('/campaigns/' + id + '/timeline').then(function (t) {
        $('timeline-out').textContent = JSON.stringify({ analytics: a, timeline: t.events }, null, 2);
      });
    });
}

function newFlow() {
  var name = prompt('Flow name?'); if (!name) return;
  postJSON('/flows', { name: name, trigger: { type: 'trigger_keyword', config: { keyword: 'hi' } }, nodes: [{ type:
'action_whatsapp_draft', config: { message: 'Salam! Kaise madad karein?' } }, { type: 'end' }] }).then(function () {

loadFlows(); });
  }

  function bind() { $('btn-new-flow').onclick = newFlow; $('btn-refresh').onclick = function () { loadFlows();
loadCampaigns(); }; $('btn-preview').onclick = preview; }
  function init() { bind(); loadFlows(); loadPalette(); loadCampaigns(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
