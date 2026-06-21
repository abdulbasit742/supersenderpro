  // public/js/superflow-studio.js
  // SuperFlow Studio frontend. Vanilla JS, no deps. Talks to /api/superflow/*.


  (function () {
    'use strict';
    var API = '/api/superflow';
    var current = null; // currently loaded flow

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&', '<': '<', '>':
  '>' }[c]; }); }
    function msg(t, isErr) { var m = $('sf-msg'); m.textContent = t || ''; m.className = isErr ? 'sf-err' : 'sf-muted'; }

    function api(method, path, body) {
      return fetch(API + path, {
         method: method,
         headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        }).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'bad json' }; }); });
    }

    // ---- Palette (static reference) ----
    var PALETTE = {
      Triggers: ['inbound_message', 'new_order', 'payment_confirmed', 'abandoned_cart', 'subscription_expiring',
  'customer_created', 'tag_added'],
      Conditions: ['message_contains', 'customer_has_tag', 'order_amount_greater_than', 'payment_status_is',
  'time_between', 'product_is', 'channel_is'],
      Actions: ['send_whatsapp_message', 'notify_admin', 'add_customer_tag', 'remove_customer_tag', 'create_followup_task',
  'call_n8n_webhook', 'append_google_sheet_row', 'update_order_status'],
        Other: ['wait', 'note'],
    };
    function renderPalette() {
      var html = '';
        Object.keys(PALETTE).forEach(function (grp) {
          html += '<div class="grp">' + grp + '</div>';
          PALETTE[grp].forEach(function (n) { html += '<span>' + n + '</span>'; });
        });
        $('sf-palette').innerHTML = html;
    }

    // ---- Flows ----
    function loadFlows() {
      return api('GET', '/flows').then(function (r) {
         var ul = $('sf-flows');
         if (!r.ok) { ul.innerHTML = '<li class="sf-err">' + esc(r.error) + '</li>'; return; }
         if (!r.flows.length) { ul.innerHTML = '<li class="sf-muted">No flows yet</li>'; return; }
         ul.innerHTML = r.flows.map(function (f) {


         return '<li data-id="' + f.id + '">' +
           '<span class="nm"><span class="sf-dot ' + (f.enabled ? 'on' : 'off') + '"></span>' + esc(f.name) + '</span>' +
           '<span class="meta">' + (f.nodes ? f.nodes.length : 0) + ' nodes</span></li>';
       }).join('');
       Array.prototype.forEach.call(ul.querySelectorAll('li[data-id]'), function (li) {
         li.addEventListener('click', function () { openFlow(li.getAttribute('data-id')); });
       });
   });
}

function openFlow(id) {
   api('GET', '/flows/' + id).then(function (r) {
     if (!r.ok) { msg(r.error, true); return; }
       current = r.flow;
       $('sf-name').value = r.flow.name || '';
       $('sf-json').value = JSON.stringify({ nodes: r.flow.nodes || [], edges: r.flow.edges || [] }, null, 2);
       setToggle(r.flow.enabled);
       highlight(id);
       msg('Loaded "' + (r.flow.name || id) + '"');
   });
}

function highlight(id) {
   Array.prototype.forEach.call(document.querySelectorAll('#sf-flows li'), function (li) {
     li.classList.toggle('active', li.getAttribute('data-id') === id);
   });
}

function setToggle(on) {
   $('sf-toggle').querySelector('.sf-dot').className = 'sf-dot ' + (on ? 'on' : 'off');
   $('sf-toggle-label').textContent = on ? 'enabled' : 'disabled';
}


function parseEditor() {
 var raw = $('sf-json').value.trim();
   if (!raw) return { nodes: [], edges: [] };
   return JSON.parse(raw); // throws on bad JSON; caller catches
}

function save() {
 var body;
   try { body = parseEditor(); }
   catch (e) { msg('Invalid JSON: ' + e.message, true); return; }
   body.name = $('sf-name').value || 'Untitled flow';
   if (current && current.id) {
     api('PUT', '/flows/' + current.id, body).then(after);
   } else {
       api('POST', '/flows', body).then(after);
   }
   function after(r) {
     if (!r.ok) { msg(r.error, true); return; }
       current = r.flow; msg('Saved.'); loadFlows().then(function () { highlight(current.id); });
   }
}


function simulate() {
 var flow;


     try { flow = parseEditor(); }
     catch (e) { msg('Invalid JSON: ' + e.message, true); return; }
     flow.name = $('sf-name').value || 'Untitled flow';
     // Sample context lets conditions evaluate; tweak freely.
     var sample = { message: 'price kya hai agent', tags: ['lapsed'], amount: 1500, paymentStatus: 'pending', product:
'chatgpt', channel: 'whatsapp', hour: 14, from: '923001234567' };
   api('POST', '/simulate', { flow: flow, sample: sample }).then(function (r) {
         if (!r.ok) { renderSim({ ok: false, errors: [r.error] }); return; }
         renderSim(r.simulation);
     });
 }


 function renderSim(sim) {
     var status = $('sf-sim-status');
     status.innerHTML = sim.ok
         ? '<span class="sf-pill ok">ok</span>'
         : '<span class="sf-pill err">errors</span>';
     var lines = [];
     lines.push('DRY-RUN: ' + (sim.dryRun ? 'yes' : 'no'));
     if (sim.path && sim.path.length) {
       lines.push('\nPath:');
     sim.path.forEach(function (s) {
       lines.push(' ' + s.type + ' ' + s.id + (s.result ? ' -> ' + s.result : '') + (s.action ? ' (' + s.action + ')' :
'') + (s.waitSeconds ? ' wait ' + s.waitSeconds + 's' : ''));
         });
     }
     if (sim.wouldDo && sim.wouldDo.length) {
       lines.push('\nWould do:');
     sim.wouldDo.forEach(function (a) { lines.push('       - ' + JSON.stringify(a)); });
     }
     if (sim.skipped && sim.skipped.length) {
     lines.push('\nSkipped:');
         sim.skipped.forEach(function (s) { lines.push('   - ' + (s.id || '') + ' (' + (s.reason || '') + ')'); });
     }
   if (sim.warnings && sim.warnings.length) { lines.push('\nWarnings:'); sim.warnings.forEach(function (w) { lines.push('      ! ' + w); }); }
   if (sim.errors && sim.errors.length) { lines.push('\nErrors:'); sim.errors.forEach(function (e) { lines.push('      x ' + e); }); }
     $('sf-sim').textContent = lines.join('\n');
 }


 function toggle() {
   if (!current || !current.id) { msg('Save the flow first.', true); return; }
     api('POST', '/flows/' + current.id + '/toggle', {}).then(function (r) {
       if (!r.ok) { msg(r.error, true); return; }
       current = r.flow; setToggle(r.flow.enabled); loadFlows().then(function () { highlight(current.id); });
     });
 }

 function duplicate() {
   if (!current || !current.id) { msg('Save the flow first.', true); return; }
     api('POST', '/flows/' + current.id + '/duplicate', {}).then(function (r) {
       if (!r.ok) { msg(r.error, true); return; }


       msg('Duplicated.'); openFlow(r.flow.id); loadFlows();
     });
 }

 function del() {
     if (!current || !current.id) { msg('Nothing to delete.', true); return; }
     if (!window.confirm('Delete this flow?')) return;
     api('DELETE', '/flows/' + current.id).then(function (r) {
       if (!r.ok) { msg(r.error, true); return; }
       current = null; $('sf-name').value = ''; $('sf-json').value = ''; setToggle(false); msg('Deleted.'); loadFlows();
     });
 }

 function newEmpty() {
   current = null;
     $('sf-name').value = 'Untitled flow';
     $('sf-json').value = JSON.stringify({ nodes: [{ id: 't1', type: 'trigger', event: 'inbound_message' }], edges: [] },
null, 2);
   setToggle(false); highlight(null); msg('New flow (unsaved).');
 }

 function loadTemplates() {
   api('GET', '/templates').then(function (r) {
       if (!r.ok) return;
       $('sf-templates').innerHTML = r.templates.map(function (t) {
           return '<div class="sf-row" style="align-items:center;justify-content:space-between;margin-bottom:6px">' +
             '<span title="' + esc(t.description) + '">' + esc(t.name) + '</span>' +
           '<button class="sf-btn secondary" data-tpl="' + t.id + '">Use</button></div>';
       }).join('');
       Array.prototype.forEach.call($('sf-templates').querySelectorAll('button[data-tpl]'), function (b) {
         b.addEventListener('click', function () {
            api('POST', '/templates/' + b.getAttribute('data-tpl') + '/create', {}).then(function (r) {
              if (!r.ok) { msg(r.error, true); return; }
              msg('Created from template.'); openFlow(r.flow.id); loadFlows();
            });
         });
       });
     });
 }


 // ---- wire up ----
 document.addEventListener('DOMContentLoaded', function () {
   renderPalette();
     loadFlows();
     loadTemplates();
     $('sf-refresh').addEventListener('click', function () { loadFlows(); loadTemplates(); });
     $('sf-new').addEventListener('click', newEmpty);
     $('sf-save').addEventListener('click', save);
     $('sf-simulate').addEventListener('click', simulate);
     $('sf-duplicate').addEventListener('click', duplicate);
     $('sf-delete').addEventListener('click', del);
   $('sf-toggle').addEventListener('click', toggle);
 });
})();
