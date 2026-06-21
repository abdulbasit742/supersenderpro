 'use strict';

 /* Group Commerce Inbox — front-end. Read-only + dry-run UI. */


 (function () {
   var API = '/api/group-commerce/inbox';
   function $(id) { return document.getElementById(id); }
   function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null)
 e.textContent = text; return e; }

   function getJSON(p) { return fetch(API + p, { headers: { 'Accept': 'application/json' } }).then(function (r) { return
 r.json(); }); }
   function postJSON(p, b) { return fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }

   function setBadge(node, label, on) {
     node.textContent = label;
       node.classList.remove('gci-badge-on', 'gci-badge-off');
       node.classList.add(on ? 'gci-badge-on' : 'gci-badge-off');
   }

   function criteria() {
     return {
         groupId: $('f-group').value || undefined,
         type: $('f-type').value || undefined,
         riskLevel: $('f-risk').value || undefined,
         query: $('f-query').value || undefined,
         minConfidence: $('f-conf').value || undefined,
         unresolvedOnly: $('f-unresolved').checked,
         suspiciousOnly: $('f-suspicious').checked,
         highValueOnly: $('f-highvalue').checked,
         sort: $('f-sort').value,
         limit: 200,
       };
   }

   function loadStatus() {
       return getJSON('/status').then(function (s) {
         if (!s || !s.ok) return;
         setBadge($('badge-enabled'), 'enabled: ' + (s.enabled ? 'yes' : 'no'), s.enabled);
         setBadge($('badge-dryrun'), 'dry-run: ' + (s.dryRun ? 'on' : 'off'), s.dryRun);
         setBadge($('badge-auto'), 'auto-actions: ' + (s.autoActions ? 'on' : 'off'), !s.autoActions);
       });
   }

   function loadSummary() {
     return getJSON('/summary').then(function (s) {

      if (!s || !s.ok) return;
      $('stat-items').textContent = s.totals.items;
      $('stat-groups').textContent = s.totals.groups;
      $('stat-demand').textContent = s.totals.buyerDemand;
      $('stat-instock').textContent = s.totals.stockAvailable;
      $('stat-suspicious').textContent = s.totals.suspiciousCount;


      var box = $('market-body'); box.innerHTML = '';
      box.appendChild(el('h4', null, 'Top products'));
      var ul = el('ul', 'gci-list');
      (s.topProducts || []).forEach(function (p) { ul.appendChild(el('li', null, p.key + ' (' + p.count + ')')); });
      box.appendChild(ul);
      box.appendChild(el('h4', null, 'Latest price / SKU'));
      var ul2 = el('ul', 'gci-list');
      (s.latestPricePerSku || []).forEach(function (p) { ul2.appendChild(el('li', null, p.sku + ': ' + (p.currency || '')
+ ' ' + p.latest + ' (min ' + p.min + ', max ' + p.max + ')')); });
    box.appendChild(ul2);
    });
}


function loadItems() {
    return postJSON('/search', criteria()).then(function (r) {
      if (!r || !r.ok) return;
      $('inbox-count').textContent = '(' + r.count + ')';
      var tbody = $('inbox-table').querySelector('tbody'); tbody.innerHTML = '';
    if (!r.items.length) { var tr0 = el('tr'); var td0 = el('td', 'gci-muted', 'No items.'); td0.colSpan = 7;
tr0.appendChild(td0); tbody.appendChild(tr0); return; }
      r.items.forEach(function (x) {
        var tr = el('tr', 'gci-row');
          tr.appendChild(el('td', null, x.type));
          tr.appendChild(el('td', null, x.groupName || x.groupId || '-'));
          tr.appendChild(el('td', null, (x.productName || '-') + (x.sku ? ' [' + x.sku + ']' : '')));
          tr.appendChild(el('td', null, x.price != null ? ((x.currency || '') + ' ' + x.price) : '-'));
          tr.appendChild(el('td', null, String(x.confidence)));
          tr.appendChild(el('td', 'gci-risk-' + x.riskLevel, x.riskLevel));
          tr.appendChild(el('td', null, x.resolved ? 'resolved' : 'open'));
          tr.onclick = function () { showDetail(x.id); };
        tbody.appendChild(tr);
      });
    });
}

function showDetail(id) {
    getJSON('/items/' + id).then(function (r) {
      if (!r || !r.ok) return;
      var x = r.item;
      var body = $('detail-body'); body.innerHTML = '';
    [['Type', x.type], ['Group', x.groupName || x.groupId], ['Role', x.roleIntent], ['Product', x.productName], ['SKU',
x.sku], ['Price', x.price != null ? (x.currency || '') + ' ' + x.price : '-'], ['Stock', x.stockStatus], ['Seller',
x.sellerIdMasked || '-'], ['Buyer', x.buyerIdMasked || '-'], ['Confidence', x.confidence], ['Risk', x.riskLevel],
['Flags', (x.flags || []).join(', ') || '-'], ['Preview', x.sourcePreview || '-']].forEach(function (row) {
      var p = el('p'); p.appendChild(el('span', 'gci-key', row[0] + ': '));
p.appendChild(document.createTextNode(String(row[1] == null ? '-' : row[1]))); body.appendChild(p);
      });
      var act = $('detail-actions'); act.innerHTML = '';
      var bSuggest = el('button', 'gci-btn', 'Suggest actions (dry-run)');
      bSuggest.onclick = function () { suggest(x.id); };

      var bResolve = el('button', 'gci-btn gci-btn-ghost', 'Mark resolved');
    bResolve.onclick = function () { postJSON('/items/' + x.id + '/resolve', {}).then(function () { loadItems();
showDetail(x.id); }); };
      act.appendChild(bSuggest); act.appendChild(bResolve);
    });
}


function suggest(id) {
  postJSON('/items/' + id + '/suggest-actions', {}).then(function (r) {
      if (!r || !r.ok) return;
      var act = $('detail-actions');
      var ul = el('ul', 'gci-list');
      (r.suggestions || []).forEach(function (s) { ul.appendChild(el('li', null, s.label + '   [' + s.type + ', dry-run]')); });
    act.appendChild(ul);
    });
}


function ingest() {
    var raw = $('ingest-input').value.trim();
    var body;
    try { body = raw.charAt(0) === '{' || raw.charAt(0) === '[' ? JSON.parse(raw) : { message: raw }; }
    catch (e) { body = { message: raw }; }
    postJSON('/ingest', body).then(function (r) {
      $('ingest-output').textContent = JSON.stringify(r, null, 2);
      loadItems(); loadSummary();
    });
}


function bind() {
  $('btn-apply').onclick = loadItems;
    $('btn-reset').onclick = function () {
      ['f-group', 'f-query', 'f-conf'].forEach(function (id) { $(id).value = ''; });
      ['f-type', 'f-risk'].forEach(function (id) { $(id).value = ''; });
      ['f-unresolved', 'f-suspicious', 'f-highvalue'].forEach(function (id) { $(id).checked = false; });
      $('f-sort').value = 'newest';
      loadItems();
    };
    $('btn-ingest').onclick = ingest;
}


function init() { bind(); loadStatus(); loadSummary(); loadItems(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
