'use strict';


/* Reseller Portal QA — front-end. Read-only + dry-run UI. */

(function () {
  var API = '/api/reseller-portal-qa';
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x;
return e; }
  function getJSON(p) { return fetch(API + p).then(function (r) { return r.json(); }); }
  function postJSON(p) { return fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body:
'{}' }).then(function (r) { return r.json(); }); }
  function setBadge(n, label, on) { n.textContent = label; n.classList.remove('rq-badge-on', 'rq-badge-off');
n.classList.add(on ? 'rq-badge-on' : 'rq-badge-off'); }

  function loadStatus() {
    return getJSON('/status').then(function (s) {
        if (!s || !s.ok) return;
        setBadge($('badge-dryrun'), 'dry-run: ' + (s.dryRun ? 'on' : 'off'), s.dryRun);
      setBadge($('badge-payout'), 'payouts: ' + (s.policy.requirePayoutDisabled ? 'disabled' : 'check'),
s.policy.requirePayoutDisabled);
      setBadge($('badge-live'), 'live-msgs: ' + (s.policy.requireLiveMessagesDisabled ? 'disabled' : 'check'),
s.policy.requireLiveMessagesDisabled);
      });
  }


  function runDoctor() {
      return postJSON('/doctor/run').then(function (d) {
        if (!d || !d.ok) return;
        $('ov-score').textContent = d.score + '%';
        $('ov-status').textContent = (d.status || '').replace(/_/g, ' ');
        $('ov-blockers').textContent = (d.blockers || []).length;
        $('ov-warnings').textContent = (d.warnings || []).length;
        var badges = $('readiness-badges'); badges.innerHTML = '';
        [['Internal demo', d.readyForInternalDemo], ['Partner preview', d.readyForPartnerPreview], ['Pilot partner',
d.readyForPilotPartner], ['Public launch', d.readyForPublicPartnerLaunch]].forEach(function (b) {
        badges.appendChild(el('span', 'rq-rbadge ' + (b[1] ? 'rq-rbadge-on' : 'rq-rbadge-off'), b[0] + (b[1] ? ' ✓' : ' ✗')));
     });
        $('doctor-out').textContent = JSON.stringify(d, null, 2);
      });
  }


  function renderChecklist(d) {
    var box = $('checklist-body'); box.innerHTML = '';

      var items = (d.checklist) || [];
      if (!items.length) { box.appendChild(el('p', 'rq-muted', 'No checklist.')); return; }
      box.appendChild(el('p', 'rq-key', 'Score: ' + d.score + '% · required ' + d.requiredPercent + '%'));
      var ul = el('ul', 'rq-list');
      items.forEach(function (it) {
      var cls = it.status === 'blocked' ? 'rq-bad' : (it.status === 'warning' || it.status === 'missing' ? 'rq-warn' :
'rq-ok');
        ul.appendChild(el('li', cls, it.title + ' — ' + it.status + (it.required ? ' *' : '')));
      });
      box.appendChild(ul);
  }

  function bind() {
      $('btn-doctor').onclick = runDoctor;
      $('btn-onboarding').onclick = function () { postJSON('/onboarding/run').then(renderChecklist); };
    $('btn-branding').onclick = function () { postJSON('/branding/run').then(function (r) { $('branding-out').textContent
= JSON.stringify(r, null, 2); }); };
    $('btn-referrals').onclick = function () { postJSON('/referrals/run').then(function (r) { $('referral-out').textContent = JSON.stringify(r, null, 2); }); };
    $('btn-commissions').onclick = function () { postJSON('/commissions/run').then(function (r) { $('commission-out').textContent = JSON.stringify(r, null, 2); }); };
    $('btn-privacy').onclick = function () { postJSON('/privacy/run').then(function (r) { $('privacy-out').textContent =
JSON.stringify(r, null, 2); }); };
    $('btn-public').onclick = function () { postJSON('/public-page/run').then(function (r) { $('public-out').textContent
= JSON.stringify(r, null, 2); }); };
    $('btn-assets').onclick = function () { postJSON('/assets/run').then(function (r) { $('assets-out').textContent =
JSON.stringify(r, null, 2); }); };
  }


  function init() { bind(); loadStatus(); runDoctor(); postJSON('/onboarding/run').then(renderChecklist); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
