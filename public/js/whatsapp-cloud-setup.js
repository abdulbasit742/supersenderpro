 'use strict';

 /* WhatsApp Cloud Setup Wizard — front-end. Read-only + dry-run UI. No secrets handled client-side. */


 (function () {
   var API = '/api/whatsapp-cloud-setup';


   function $(id) { return document.getElementById(id); }
   function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null)
 e.textContent = text; return e; }

   function getJSON(path) {
     return fetch(API + path, { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); });
   }
   function postJSON(path, body) {
       return fetch(API + path, {
         method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body || {}),
       }).then(function (r) { return r.json(); });
   }
   function del(path) {
     return fetch(API + path, { method: 'DELETE' }).then(function (r) { return r.json(); });
   }

   function setBadge(node, label, on) {
     node.textContent = label;
       node.classList.remove('wcs-badge-on', 'wcs-badge-off');
       node.classList.add(on ? 'wcs-badge-on' : 'wcs-badge-off');
   }

   function loadStatus() {
     return getJSON('/status').then(function (s) {
        if (!s || !s.ok) return;
        setBadge($('badge-enabled'), 'enabled: ' + (s.enabled ? 'yes' : 'no'), s.enabled);
        setBadge($('badge-dryrun'), 'dry-run: ' + (s.mode.dryRun ? 'on' : 'off'), s.mode.dryRun);
        setBadge($('badge-livetest'), 'live-test: ' + (s.mode.liveTest ? 'on' : 'off'), !s.mode.liveTest);


        var total = 5; var have = total - (s.missing ? s.missing.length : total);
        var pct = Math.round((have / total) * 100);
        $('setup-score').textContent = pct + '%';
       $('setup-score-note').textContent = s.configured ? 'Core config complete.' : (have + ' of ' + total + ' required values set.');

        var ml = $('missing-list'); ml.innerHTML = '';
        if (!s.missing || s.missing.length === 0) { ml.appendChild(el('li', 'wcs-ok', 'Nothing missing.')); }
        else { s.missing.forEach(function (m) { ml.appendChild(el('li', 'wcs-bad', m)); }); }

      var rl = $('readiness-list'); rl.innerHTML = '';
      (s.warnings || []).forEach(function (w) { rl.appendChild(el('li', null, w)); });
    });
}

function loadConfig() {
    return getJSON('/config').then(function (c) {
      if (!c || !c.ok) return;
      var rows = c.safeMaskedPreview;
      var tbody = $('config-table').querySelector('tbody'); tbody.innerHTML = '';
      Object.keys(rows).forEach(function (k) {
        var tr = el('tr');
          tr.appendChild(el('td', 'wcs-key', k));
          var v = rows[k];
          var td = el('td', null, String(v));
          if (String(v).indexOf('missing') !== -1) td.classList.add('wcs-bad');
          else td.classList.add('wcs-ok');
          tr.appendChild(td);
        tbody.appendChild(tr);
      });
    });
}


function loadTemplates() {
    return getJSON('/templates').then(function (t) {
      if (!t || !t.ok) return;
      $('tpl-count').textContent = '(' + t.summary.total + ')';
      var tbody = $('templates-table').querySelector('tbody'); tbody.innerHTML = '';
      var sel = $('preview-template'); sel.innerHTML = '';
      t.templates.forEach(function (tpl) {
          var tr = el('tr');
          tr.appendChild(el('td', null, tpl.name));
          tr.appendChild(el('td', null, tpl.category));
          tr.appendChild(el('td', null, tpl.language));
          tr.appendChild(el('td', null, (tpl.placeholders || []).join(', ')));
          tr.appendChild(el('td', 'wcs-status', tpl.status));
          tbody.appendChild(tr);
          var opt = el('option', null, tpl.name); opt.value = tpl.name; sel.appendChild(opt);
      });
    });
}


function loadWebhook() {
  return getJSON('/webhook-diagnostics').then(function (d) {
      if (!d || !d.ok) return;
      var box = $('webhook-output'); box.innerHTML = '';
    box.appendChild(el('p', null, 'Verify token: ' + d.verifyTokenStatus + ' | Webhook secret: ' +
d.webhookSecretStatus));
      (d.issues || []).forEach(function (i) { box.appendChild(el('p', 'wcs-bad', i)); });
      var ul = el('ul', 'wcs-list');
      (d.recommendedPublicUrlChecklist || []).forEach(function (c) { ul.appendChild(el('li', null, c)); });
      (d.eventSubscriptionChecklist || []).forEach(function (c) { ul.appendChild(el('li', null, c)); });
      box.appendChild(ul);
      box.appendChild(el('p', 'wcs-muted', d.signatureVerificationRecommendation));
    });
}

function loadHistory() {
  return getJSON('/history?limit=50').then(function (h) {
      if (!h || !h.ok) return;
      var tbody = $('history-table').querySelector('tbody'); tbody.innerHTML = '';
    if (!h.entries.length) { var tr0 = el('tr'); var td0 = el('td', 'wcs-muted', 'No history yet.'); td0.colSpan = 7;
tr0.appendChild(td0); tbody.appendChild(tr0); return; }
      h.entries.forEach(function (e) {
        var tr = el('tr');
          tr.appendChild(el('td', null, new Date(e.timestamp).toLocaleString()));
          tr.appendChild(el('td', null, e.action));
          tr.appendChild(el('td', null, e.dryRun ? 'dry-run' : 'live'));
          tr.appendChild(el('td', null, e.templateName || '-'));
          tr.appendChild(el('td', null, e.maskedTarget || '-'));
          tr.appendChild(el('td', null, e.status));
          var tdBtn = el('td');
          var b = el('button', 'wcs-btn wcs-btn-tiny', 'delete');
          b.onclick = function () { del('/history/' + e.id).then(loadHistory); };
          tdBtn.appendChild(b); tr.appendChild(tdBtn);
        tbody.appendChild(tr);
      });
    });
}

function parseParams(s) {
    if (!s) return [];
    return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}


function bindActions() {
  $('btn-preview').onclick = function () {
      postJSON('/templates/preview', {
        templateName: $('preview-template').value,
          to: $('preview-to').value,
          params: parseParams($('preview-params').value),
      }).then(function (r) {
        $('preview-output').textContent = JSON.stringify(r, null, 2);
        loadHistory();
      });
    };
    $('btn-test').onclick = function () {
      postJSON('/templates/test', {
        templateName: $('preview-template').value,
          to: $('preview-to').value,
          params: parseParams($('preview-params').value),
      }).then(function (r) {
        $('preview-output').textContent = JSON.stringify(r, null, 2);
        loadHistory();
      });
    };
}


function init() {
    bindActions();
    loadStatus();
    loadConfig();
    loadTemplates();

    loadWebhook();
    loadHistory();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
