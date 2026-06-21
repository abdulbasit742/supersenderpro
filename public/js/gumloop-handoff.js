  'use strict';
  const API = '/api/gumloop-handoff';

const $ = (s) => document.querySelector(s);
async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
error: 'unavailable' }; } }


async function loadStatus() {
   const s = await j(API + '/status');
   const dry = s && s.safety ? s.safety.dryRun : true;
   $('#gh-mode').textContent = dry ? 'DRY-RUN · read-only · no push' : 'CHECK CONFIG';
   $('#gh-mode').className = 'gh-badge ' + (dry ? 'safe' : 'warn');
   $('#safety-result').textContent = JSON.stringify((s && s.safety) || { unavailable: true }, null, 2);
}

async function loadManifest() {
 const r = await j(API + '/report/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body:
'{}' });
   const m = (r && r.manifest) || {};
   $('#ov-safe').textContent = (m.safeToCopy || []).length;
   $('#ov-never').textContent = (m.neverCopy || []).length;
   $('#ov-unknown').textContent = (m.unknownReview || []).length;
   $('#ov-blockers').textContent = (m.blockers || []).length;
   $('#ov-warnings').textContent = (m.warnings || []).length;
   $('#safe-list').innerHTML = listOf(m.safeToCopy);
   $('#created-list').innerHTML = listOf(m.createdFiles);
   $('#modified-list').innerHTML = listOf((m.modifiedFiles || []).map((x) => x.file + ' (' + x.change + ')'));
   $('#never-list').innerHTML = (m.neverCopy || []).map((p) => '<li>' + esc(p) + '</li>').join('') || '<li class="muted">none detected in posted set</li>';
 $('#merge-list').innerHTML = (m.mergeRisks || []).map((r) => '<div class="gh-step ' + r.riskLevel + '"><strong>' +
esc(r.file) + '</strong> <span class="tag">' + esc(r.riskLevel) + '</span><div class="muted">' + esc(r.reason) + '</div><div>→ ' + esc(r.recommendedMergeAction) + '</div><div class="muted">' + esc(r.safePatchNotes) + '</div></div>').join('');
 $('#route-list').innerHTML = (m.routeMounts || []).map((x) => row(x.routeFile, x.apiBase + ' · mounted: ' +
x.mounted)).join('');
 $('#dash-list').innerHTML = (m.dashboardLinks || []).map((x) => row(x.pageFile, 'link: ' + x.linkExistsInDashboard + ' · js: ' + x.jsExists + ' · css: ' + x.cssExists)).join('');
 $('#script-list').innerHTML = (m.packageScripts || []).map((x) => row(x.script, 'exists: ' + x.exists + ' · ' +
x.recommendedGumloopValidation)).join('');
 $('#runbook-list').innerHTML = (m.gumloopNextSteps || []).map((s) => '<li>' + esc(s) + '</li>').join('');
}

function listOf(arr) { return '<ul class="gh-files">' + (arr || []).map((p) => '<li>' + esc(typeof p === 'string' ? p :
JSON.stringify(p)) + '</li>').join('') + '</ul>'; }
function row(a, b) { return '<div class="gh-row"><code>' + esc(a) + '</code><span class="muted">' + esc(b) + '</span></div>'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }

document.addEventListener('click', (e) => {
 if (e.target.matches('.gh-tabs button')) {
       document.querySelectorAll('.gh-tabs button').forEach((b) => b.classList.remove('active'));
       e.target.classList.add('active');
       const tab = e.target.dataset.tab;
       document.querySelectorAll('.gh-tab').forEach((s) => (s.hidden = true));
       $('#tab-' + tab).hidden = false;
   }
});
(async function () { await loadStatus(); await loadManifest(); })();
