/* public/js/revenue-ops.js — read-only RevOps command center client. No live actions. */
(function () {
  'use strict';
  var BASE = '/api/revenue-ops';
  function $(s, r) { return (r || document).querySelector(s); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function get(p) { return fetch(BASE + p, { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }); }
  function post(p, b) { return fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }
  function pill(ok, t) { return el('span', 'pill ' + (ok ? 'ok' : 'no'), t || (ok ? 'yes' : 'no')); }
  function load(id) { var c = $('#' + id); if (c) c.innerHTML = '<div class="loading">Loading preview…</div>'; }
  function err(id) { var c = $('#' + id); if (c) c.innerHTML = '<div class="err">Preview unavailable right now.</div>'; }
  function rows(id, pairs) {
    var c = $('#' + id); if (!c) return; c.innerHTML = '';
    if (!pairs.length) { c.appendChild(el('div', 'empty', 'Nothing to show.')); return; }
    pairs.forEach(function (p) { var r = el('div', 'row'); r.appendChild(el('span', 'k', p[0])); if (p[1] && p[1].nodeType) r.appendChild(p[1]); else r.appendChild(el('span', 'v', String(p[1]))); c.appendChild(r); });
  }
  function listInto(id, items, fmt) {
    var c = $('#' + id); if (!c) return; c.innerHTML = '';
    if (!items || !items.length) { c.appendChild(el('div', 'empty', 'None in preview.')); return; }
    var ul = el('ul', 'list'); items.slice(0, 60).forEach(function (it) { var li = el('li'); fmt(li, it); ul.appendChild(li); }); c.appendChild(ul);
  }
  function gauge(id, v, invert) {
    var g = $('#' + id); if (!g) return; v = Math.max(0, Math.min(100, Number(v) || 0));
    var good = invert ? v < 30 : v >= 75; var mid = invert ? v < 60 : v >= 50;
    g.style.setProperty('--v', v); g.style.setProperty('--c', good ? 'var(--ok)' : (mid ? 'var(--warn)' : 'var(--bad)'));
    var s = g.querySelector('span'); if (s) s.textContent = v;
  }
  function lvlPill(level) {
    var good = /Strong|Ready|Hot|Low|High conf/i.test(level); var bad = /Critical|Cold|High|Suppressed|Lost/i.test(level);
    return el('span', 'pill ' + (bad ? 'no' : good ? 'ok' : 'warn'), level);
  }

  function loadStatus() {
    load('status-card');
    get('/status').then(function (s) {
      rows('status-card', [['Feature', el('span', 'tag', 'RevOps')], ['Version', el('span', 'tag', s.version || '-')], ['Enabled', pill(s.revenueOpsEnabled)], ['Stages', String((s.supportedStages || []).length)]]);
      var bc = $('#safety-badges'); bc.innerHTML = '';
      ['Dry Run', 'Preview Only', 'Read Only', 'No Live Send', 'No Meta API Call', 'No Live AI Call', 'PII Masked'].forEach(function (b) { bc.appendChild(el('span', 'badge', b)); });
    }).catch(function () { err('status-card'); });
  }

  function loadDashboard() {
    load('summary-card'); load('opps-card');
    get('/dashboard-data').then(function (d) {
      $('#summary-card').innerHTML = '';
      var k = el('div', 'kpi');
      [['Opportunities', d.totalOpportunitiesPreview], ['Leads', d.totalLeadsPreview], ['Forecast', d.forecastPreview.forecastConfidence], ['Risk', d.revenueRiskPreview.revenueRiskLevel]].forEach(function (x) {
        var b = el('div'); b.appendChild(el('div', 'num', String(x[1]))); b.appendChild(el('div', 'lbl', x[0])); k.appendChild(b);
      });
      $('#summary-card').appendChild(k);
      gauge('health-gauge', d.pipelineHealthPreview.pipelineHealthScore, false);
      rows('health-meta', [['Level', lvlPill(d.pipelineHealthPreview.pipelineHealthLevel)], ['Risks', String((d.pipelineHealthPreview.risks || []).length)]]);
      gauge('risk-gauge', d.revenueRiskPreview.revenueRiskScore, true);
      rows('risk-meta', [['Level', lvlPill(d.revenueRiskPreview.revenueRiskLevel)], ['Reasons', String((d.revenueRiskPreview.reasons || []).length)]]);
      rows('forecast-card', [['Forecast', el('span', 'tag', d.forecastPreview.forecastAmountPreview)], ['Confidence', lvlPill(d.forecastPreview.forecastConfidence)], ['Expected wins', String(d.forecastPreview.expectedWinsPreview)], ['Weighted score', String(d.forecastPreview.weightedForecastScore)]]);
      // opportunities table
      var c = $('#opps-card'); c.innerHTML = '';
      var wrap = el('div', 'table-wrapper'); var t = el('table');
      t.innerHTML = '<thead><tr><th>Customer</th><th>Stage</th><th>Score</th><th>Close%</th><th>Risk</th></tr></thead>';
      var tb = el('tbody');
      d.opportunitiesPreview.forEach(function (o) {
        var tr = el('tr');
        tr.appendChild(el('td', null, o.maskedCustomerName));
        tr.appendChild(el('td', null, o.stage));
        tr.appendChild(el('td', null, String(o.dealScore)));
        tr.appendChild(el('td', null, String(o.closeProbabilityPreview) + '%'));
        var td = el('td'); td.appendChild(lvlPill(o.riskLevel)); tr.appendChild(td);
        tb.appendChild(tr);
      });
      t.appendChild(tb); wrap.appendChild(t); c.appendChild(wrap);
    }).catch(function () { err('summary-card'); err('opps-card'); });
  }

  function loadLeads() { load('leads-card'); get('/leads').then(function (r) { listInto('leads-card', r.leadsPreview, function (li, l) { li.appendChild(el('span', null, l.maskedName + ' · ' + l.stage)); li.appendChild(el('span', 'muted', l.source)); }); }).catch(function () { err('leads-card'); }); }

  function loadAnalyze() {
    load('conv-card'); load('fu-card'); load('recs-card');
    post('/analyze', {}).then(function (a) {
      var conv = a.conversionAnalyticsPreview;
      rows('conv-card', [['Lead→Qualified', conv.leadToQualifiedRatePreview + '%'], ['Qualified→Quote', conv.qualifiedToQuoteRatePreview + '%'], ['Quote→Won', conv.quoteToWonRatePreview + '%'], ['Top stuck stage', el('span', 'tag', conv.topStuckStagePreview)], ['Best source', el('span', 'tag', conv.bestLeadSourcePreview)]]);
      var fu = a.followupReadinessPreview;
      rows('fu-card', [['Readiness', String(fu.followupReadinessScore)], ['Level', lvlPill(fu.readinessLevel)], ['Suggested', el('span', 'tag', fu.suggestedFollowupType)]]);
      var c = $('#recs-card'); c.innerHTML = '';
      var ul = el('ul', 'list recs');
      a.recommendationsPreview.forEach(function (x) { var li = el('li'); li.appendChild(el('span', 'pill ' + (x.priority === 'high' ? 'no' : x.priority === 'medium' ? 'warn' : 'ok'), x.priority)); li.appendChild(el('span', null, x.action)); ul.appendChild(li); });
      c.appendChild(ul);
    }).catch(function () { err('conv-card'); err('fu-card'); err('recs-card'); });
  }

  function loadReps() { load('reps-card'); post('/rep-performance', {}).then(function (r) { listInto('reps-card', r.repsPreview, function (li, x) { li.appendChild(el('span', null, x.maskedRepPreview + ' · ' + x.assignedOpportunitiesCountPreview + ' opps')); li.appendChild(el('span', 'muted', 'conv ' + x.conversionScorePreview + '%')); }); }).catch(function () { err('reps-card'); }); }

  function loadCompare() {
    load('compare-card');
    post('/opportunities/compare-preview', {
      opportunityA: { id: 'opp_demo_1', stage: 'Quotation Sent', valueBand: 'high', lastContactDays: 2, replies: 4 },
      opportunityB: { id: 'opp_demo_2', stage: 'New Lead', valueBand: 'medium', lastContactDays: 12, replies: 1 }
    }).then(function (r) {
      rows('compare-card', [
        ['Opportunity A score', String(r.opportunityAPreview.dealScore) + ' (' + r.opportunityAPreview.closeProbabilityPreview + '%)'],
        ['Opportunity B score', String(r.opportunityBPreview.dealScore) + ' (' + r.opportunityBPreview.closeProbabilityPreview + '%)'],
        ['Better priority', el('span', 'pill ok', r.betterPriorityPreview)],
        ['Reason', el('span', 'muted', r.reasonPreview)]
      ]);
    }).catch(function () { err('compare-card'); });
  }

  function loadAudit() { load('audit-card'); get('/audit-preview').then(function (r) { listInto('audit-card', r.auditPreview, function (li, a) { li.appendChild(el('span', null, a.actorPreview + ' · ' + a.action)); li.appendChild(el('span', 'muted', a.result)); }); }).catch(function () { err('audit-card'); }); }

  function loadAll() { loadStatus(); loadDashboard(); loadLeads(); loadAnalyze(); loadReps(); loadCompare(); loadAudit(); }

  document.addEventListener('DOMContentLoaded', function () {
    $('#btn-refresh').addEventListener('click', loadAll);
    $('#btn-pipeline').addEventListener('click', loadDashboard);
    $('#btn-leads').addEventListener('click', loadLeads);
    $('#btn-analyze').addEventListener('click', loadAnalyze);
    $('#btn-compare').addEventListener('click', loadCompare);
    $('#btn-recs').addEventListener('click', loadAnalyze);
    loadAll();
  });
})();
