/* public/js/platform-control.js — read-only command center client. No live actions. */
(function () {
  'use strict';
  var BASE = '/api/platform-control';
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function get(path) { return fetch(BASE + path, { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }); }
  function post(path) { return fetch(BASE + path, { method: 'POST', headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }); }

  function pill(ok, t) { var p = el('span', 'pill ' + (ok ? 'ok' : 'no'), t || (ok ? 'ready' : 'no')); return p; }
  function setLoading(id) { var c = $('#' + id); if (c) c.innerHTML = '<div class="loading">Loading preview…</div>'; }
  function setErr(id) { var c = $('#' + id); if (c) c.innerHTML = '<div class="err">Preview unavailable right now.</div>'; }
  function rows(id, pairs) {
    var c = $('#' + id); if (!c) return; c.innerHTML = '';
    if (!pairs.length) { c.appendChild(el('div', 'empty', 'Nothing to show.')); return; }
    pairs.forEach(function (p) {
      var r = el('div', 'row'); r.appendChild(el('span', 'k', p[0]));
      if (p[1] && p[1].nodeType) r.appendChild(p[1]); else r.appendChild(el('span', 'v', String(p[1])));
      c.appendChild(r);
    });
  }
  function listInto(id, items, fmt) {
    var c = $('#' + id); if (!c) return; c.innerHTML = '';
    if (!items || !items.length) { c.appendChild(el('div', 'empty', 'None detected (preview).')); return; }
    var ul = el('ul', 'list');
    items.slice(0, 60).forEach(function (it) { var li = el('li'); fmt(li, it); ul.appendChild(li); });
    c.appendChild(ul);
  }

  function gauge(id, value, invert) {
    var g = $('#' + id); if (!g) return;
    var v = Math.max(0, Math.min(100, Number(value) || 0));
    var good = invert ? (v < 30) : (v >= 75);
    var mid = invert ? (v < 60) : (v >= 50);
    var color = good ? 'var(--ok)' : (mid ? 'var(--warn)' : 'var(--bad)');
    g.style.setProperty('--v', v); g.style.setProperty('--c', color);
    var span = g.querySelector('span'); if (span) span.textContent = v;
  }

  function loadStatus() {
    setLoading('status-card');
    get('/status').then(function (s) {
      var c = $('#status-card'); c.innerHTML = '';
      rows('status-card', [
        ['Feature', el('span', 'tag', s.feature || 'platform-control')],
        ['Version', el('span', 'tag', s.version || '-')],
        ['Enabled', pill(s.platformControlEnabled, s.platformControlEnabled ? 'on' : 'off')],
        ['Supported modules', String((s.supportedModules || []).length)],
      ]);
      var bc = $('#safety-badges'); bc.innerHTML = '';
      [['dryRun', s.dryRun], ['readOnly', s.readOnly], ['liveActions OFF', s.liveActionsEnabled === false],
       ['externalCalls OFF', s.externalCallsEnabled === false], ['PII masked', s.piiMasked],
       ['secrets hidden', s.secretsExposed === false]].forEach(function (b) {
        bc.appendChild(el('span', 'badge ok', b[0]));
      });
    }).catch(function () { setErr('status-card'); });
  }

  function loadSummary() {
    setLoading('summary-card');
    get('/summary').then(function (s) {
      $('#summary-card').innerHTML = '';
      var grid = el('div', 'kpi');
      [['Modules', s.totalModulesPreview], ['Routes', s.totalRoutesPreview], ['Pages', s.totalDashboardPagesPreview],
       ['Flags', s.totalFeatureFlagsPreview], ['High-risk', s.highRiskFindingsPreview]].forEach(function (k) {
        var b = el('div'); b.appendChild(el('div', 'num', String(k[1] != null ? k[1] : '–'))); b.appendChild(el('div', 'lbl', k[0])); grid.appendChild(b);
      });
      $('#summary-card').appendChild(grid);
    }).catch(function () { setErr('summary-card'); });
  }

  function loadScores() {
    get('/score/release-readiness').then(function (r) {
      gauge('release-gauge', r.scorePreview, false);
      rows('release-meta', [['Grade', el('span', 'tag', r.gradePreview)], ['Pass', pill(r.passPreview, r.passPreview ? 'yes' : 'no')], ['Blockers', String((r.blockers || []).length)]]);
    }).catch(function () { setErr('release-meta'); });
    get('/score/risk').then(function (r) {
      gauge('risk-gauge', r.riskScorePreview, true);
      var lvl = r.riskLevelPreview;
      rows('risk-meta', [['Level', el('span', 'pill ' + (lvl === 'low' ? 'ok' : lvl === 'medium' ? 'warn' : 'no'), lvl)], ['Signals', String((r.riskSignalsPreview || []).length)]]);
    }).catch(function () { setErr('risk-meta'); });
  }

  function loadModules() {
    setLoading('modules-card');
    get('/modules').then(function (r) {
      listInto('modules-card', r.modulesPreview, function (li, m) {
        li.appendChild(el('span', null, m.name + '  '));
        li.appendChild(pill(m.exists, m.exists ? 'present' : 'missing'));
      });
    }).catch(function () { setErr('modules-card'); });
  }
  function loadRoutes() {
    setLoading('routes-card');
    get('/routes').then(function (r) {
      var meta = [['Endpoints', String(r.totalPreview)], ['Duplicate mounts', String((r.duplicateRoutesPreview || []).length)], ['Possibly unmounted', String((r.missingMountsPreview || []).length)]];
      rows('routes-card', meta);
    }).catch(function () { setErr('routes-card'); });
  }
  function loadPages() {
    setLoading('pages-card');
    get('/dashboard-pages').then(function (r) {
      listInto('pages-card', r.pagesPreview, function (li, p) { li.appendChild(el('span', null, p.page + '  ')); li.appendChild(pill(p.exists)); });
    }).catch(function () { setErr('pages-card'); });
  }
  function loadFlags() {
    setLoading('flags-card');
    get('/feature-flags').then(function (r) {
      listInto('flags-card', r.flagsPreview, function (li, f) {
        li.appendChild(el('span', 'tag', f.key));
        li.appendChild(pill(f.enabledPreview, f.enabledPreview ? 'on' : 'off'));
      });
    }).catch(function () { setErr('flags-card'); });
  }

  function readinessCard(id, path, fields) {
    setLoading(id);
    get(path).then(function (r) {
      var pairs = fields.map(function (f) {
        var v = r[f[1]];
        if (typeof v === 'boolean') return [f[0], pill(v)];
        if (Array.isArray(v)) return [f[0], String(v.length)];
        return [f[0], v == null ? '–' : String(v)];
      });
      rows(id, pairs);
    }).catch(function () { setErr(id); });
  }

  function loadSafety() {
    setLoading('safety-card');
    get('/safety/guard-report').then(function (r) {
      var pairs = [
        ['Safety signals', String((r.safetySignalsPreview || []).length)],
        ['Duplicate routes', String((r.duplicateRouteMountsPreview || []).length)],
        ['Duplicate links', String((r.duplicateDashboardLinksPreview || []).length)],
        ['Broken references', String(r.brokenReferencesCountPreview || 0)],
        ['PII/secret findings', String(r.piiFindingsCountPreview || 0)],
      ];
      rows('safety-card', pairs);
    }).catch(function () { setErr('safety-card'); });
  }
  function loadLogs() {
    setLoading('logs-card');
    get('/safety/log-preview').then(function (r) {
      listInto('logs-card', r.logsPreview, function (li, l) { li.appendChild(el('span', null, '[' + l.level + '] ' + l.message)); });
    }).catch(function () { setErr('logs-card'); });
  }
  function loadAudit() {
    setLoading('audit-card');
    get('/safety/audit-preview').then(function (r) {
      listInto('audit-card', r.auditTrailPreview, function (li, a) { li.appendChild(el('span', null, a.actor + ' · ' + a.action)); li.appendChild(el('span', 'muted', a.result)); });
    }).catch(function () { setErr('audit-card'); });
  }
  function loadRecs() {
    setLoading('recs-card');
    get('/recommendations').then(function (r) {
      var c = $('#recs-card'); c.innerHTML = '';
      if (!r.recommendationsPreview || !r.recommendationsPreview.length) { c.appendChild(el('div', 'empty', 'No critical actions detected (preview).')); return; }
      var ul = el('ul', 'list recs');
      r.recommendationsPreview.forEach(function (x) {
        var li = el('li');
        li.appendChild(el('span', 'pill ' + (x.priority === 'high' ? 'no' : x.priority === 'medium' ? 'warn' : 'ok'), x.priority));
        li.appendChild(el('span', null, x.action));
        ul.appendChild(li);
      });
      c.appendChild(ul);
    }).catch(function () { setErr('recs-card'); });
  }

  function loadReadiness() {
    readinessCard('env-card', '/readiness/env', [['Required missing', 'requiredKeysMissingPreview'], ['Optional missing', 'optionalKeysMissingPreview'], ['Declared keys', 'totalDeclaredPreview'], ['Secrets exposed', 'secretsExposed']]);
    readinessCard('secrets-card', '/readiness/secrets', [['Tracked keys', 'secretPresencePreview'], ['Missing', 'missingSecretsPreview'], ['Secrets exposed', 'secretsExposed']]);
    readinessCard('wa-card', '/readiness/whatsapp', [['Baileys', 'baileysReadyPreview'], ['Cloud API', 'cloudApiReadyPreview'], ['Webhook', 'webhookReadyPreview'], ['Live send', 'liveSendEnabled']]);
    readinessCard('wac-card', '/readiness/whatsapp-cloud', [['Files', 'filesReadyPreview'], ['Live Meta API', 'liveMetaApiEnabled'], ['Missing keys', 'missingKeysPreview']]);
    readinessCard('ai-card', '/readiness/ai', [['Providers', 'configuredProvidersMaskedPreview'], ['Modules', 'modulesReadyPreview'], ['RAG', 'ragReadyPreview'], ['Live AI', 'liveAiCallEnabled']]);
    readinessCard('rag-card', '/readiness/rag', [['Knowledge modules', 'knowledgeModulesPreview'], ['Vector DB', 'vectorDbReadyPreview'], ['Live query', 'liveVectorQueryEnabled']]);
    readinessCard('queue-card', '/readiness/queue', [['Redis', 'redisConfiguredPreview'], ['Adapter', 'queueAdapterAvailablePreview'], ['In-memory fallback', 'inMemoryFallbackAvailablePreview'], ['Live mutation', 'liveQueueMutation']]);
    readinessCard('db-card', '/readiness/database', [['DB URL', 'databaseUrlConfiguredPreview'], ['JSON store', 'jsonStoreAvailablePreview'], ['Connection required', 'dbConnectionRequiredToStart']]);
    readinessCard('integ-card', '/readiness/integrations', [['Detected', 'totalDetectedPreview'], ['External calls', 'externalCallsEnabled']]);
    readinessCard('webhook-card', '/readiness/webhooks', [['Dispatcher', 'dispatcherPreview'], ['Live dispatch', 'liveWebhookDispatchEnabled']]);
    readinessCard('campaign-card', '/readiness/campaigns', [['Engine', 'campaignEnginePreview'], ['Scheduler', 'schedulerPreview'], ['Live send', 'liveCampaignSendEnabled']]);
    readinessCard('ratelimit-card', '/readiness/rate-limits', [['Security module', 'securityModulePreview'], ['Rate-limit hint', 'rateLimitHintPreview']]);
    readinessCard('backup-card', '/readiness/backup', [['Backup script', 'backupScriptPreview'], ['Restore script', 'restoreScriptPreview'], ['Live backup', 'liveBackupExecution']]);
    readinessCard('deploy-card', '/readiness/deployment', [['Ready', 'readyCountPreview'], ['Total', 'totalPreview'], ['Pending', 'pendingPreview']]);
  }

  function loadBrokenAndPii() {
    setLoading('broken-card');
    get('/safety/broken-references').then(function (r) {
      listInto('broken-card', r.brokenReferencesPreview, function (li, b) { li.appendChild(el('span', 'tag', b.page)); li.appendChild(el('span', 'muted', b.ref)); });
    }).catch(function () { setErr('broken-card'); });
    setLoading('checks-card');
    get('/checks').then(function (r) {
      listInto('checks-card', r.checkPlanPreview, function (li, c) { li.appendChild(el('span', null, c)); });
    }).catch(function () { setErr('checks-card'); });
  }

  function loadAll() { loadStatus(); loadSummary(); loadScores(); loadModules(); loadRoutes(); loadPages(); loadFlags(); loadSafety(); loadLogs(); loadAudit(); loadRecs(); loadReadiness(); loadBrokenAndPii(); }

  document.addEventListener('DOMContentLoaded', function () {
    $('#btn-refresh').addEventListener('click', loadAll);
    $('#btn-modules').addEventListener('click', loadModules);
    $('#btn-routes').addEventListener('click', loadRoutes);
    $('#btn-dash').addEventListener('click', loadPages);
    $('#btn-readiness').addEventListener('click', loadReadiness);
    $('#btn-recs').addEventListener('click', loadRecs);
    $('#btn-checks').addEventListener('click', function () { post('/checks/run-preview').then(function (r) { listInto('checks-card', r.checkPlanPreview, function (li, c) { li.appendChild(el('span', null, c)); }); }); });
    $('#btn-smoke').addEventListener('click', function () { post('/smoke-tests/run-preview').then(function (r) { listInto('checks-card', r.smokePlanPreview, function (li, c) { li.appendChild(el('span', 'tag', c)); }); }); });
    loadAll();
  });
})();
