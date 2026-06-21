 'use strict';

 /**
  * Incident Command — Express router.
  *
  * Mount in server.js (inside the marked hook):
  *   const incidentCommandRoutes = require('./routes/incidentCommandRoutes');
  *     app.use('/api/incident-command', incidentCommandRoutes);
  *
  * SAFETY: read-only aggregation + local incident state only. doctor/run is
  * read-only. alerts/test is dry-run. No live WhatsApp/social/email. No destructive auto-fix.
  */

 const express = require('express');
 const router = express.Router();

 const guard = require('../lib/incidentCommand/safetyGuard');
 const healthAggregator = require('../lib/incidentCommand/healthAggregator');
 const registry = require('../lib/incidentCommand/moduleRegistry');
 const incidentStore = require('../lib/incidentCommand/incidentStore');
 const detector = require('../lib/incidentCommand/incidentDetector');
 const runbooks = require('../lib/incidentCommand/runbooks');
 const recovery = require('../lib/incidentCommand/recoverySteps');
 const alertRules = require('../lib/incidentCommand/alertRules');
 const alertFormatter = require('../lib/incidentCommand/alertFormatter');
 const owner = require('../lib/incidentCommand/adapters/ownerCommandAdapter');
 const sev = require('../lib/incidentCommand/severityEngine');

 router.use(function (req, res, next) {
      if (!guard.enabled()) return res.status(404).json({ ok: false, error: 'incident_command_disabled' });
      next();
 });

 function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
 'internal_error' }); } }; }

 // GET /status
 router.get('/status', wrap(function (req, res) {
   res.json({ ok: true, feature: 'incident-command', enabled: guard.enabled(), dryRun: guard.dryRun(), liveAlerts:
 guard.allowLiveAlerts(), autoFix: guard.allowAutoFix(), store: incidentStore.statusInfo(), alerts:
 alertRules.statusInfo(), modules: registry.list().length });
 }));

 // GET /health (last snapshot) | POST /health/run (recompute, read-only adapters)
 router.get('/health', wrap(function (req, res) { res.json({ ok: true, records: incidentStore.getHealth() }); }));
 router.post('/health/run', wrap(function (req, res) { const run = healthAggregator.run(true); res.json(Object.assign({
 ok: true }, run)); }));

// GET /modules
router.get('/modules', wrap(function (req, res) { res.json({ ok: true, modules: registry.list() }); }));


// GET /incidents (+ optional filters)   | GET /incidents/:id
router.get('/incidents', wrap(function (req, res) {
 let items = incidentStore.listIncidents();
 const q = req.query || {};
 if (q.severity) items = items.filter(function (x) { return x.severity === q.severity; });
 if (q.moduleId) items = items.filter(function (x) { return x.moduleId === q.moduleId; });
 if (q.state) items = items.filter(function (x) { return x.state === q.state; });
 res.json({ ok: true, count: items.length, incidents: items });
}));
router.get('/incidents/:id', wrap(function (req, res) { const i = incidentStore.getIncident(req.params.id); return i ?
res.json({ ok: true, incident: i, recovery: recovery.forIncident(i) }) : res.status(404).json({ ok: false, error:
'not_found' }); }));

// local-state only mutations
router.post('/incidents/:id/ack', wrap(function (req, res) { const i = incidentStore.ack(req.params.id); return i ?
res.json({ ok: true, incident: i }) : res.status(404).json({ ok: false, error: 'not_found' }); }));
router.post('/incidents/:id/resolve', wrap(function (req, res) { const i = incidentStore.resolve(req.params.id); return i
? res.json({ ok: true, incident: i }) : res.status(404).json({ ok: false, error: 'not_found' }); }));
router.post('/incidents/:id/snooze', wrap(function (req, res) { const i = incidentStore.snooze(req.params.id, (req.body
|| {}).minutes); return i ? res.json({ ok: true, incident: i }) : res.status(404).json({ ok: false, error: 'not_found'
}); }));


// runbooks
router.get('/runbooks', wrap(function (req, res) { res.json({ ok: true, runbooks: runbooks.list() }); }));
router.get('/runbooks/:id', wrap(function (req, res) { const r = runbooks.get(req.params.id); return r ? res.json({ ok:
true, runbook: r }) : res.status(404).json({ ok: false, error: 'not_found' }); }));

// doctor/run — read-only detection; optionally persist detected incidents
router.post('/doctor/run', wrap(function (req, res) {
 const det = detector.detect();
 const persist = (req.body || {}).persist === true;
 let created = [];
 if (persist) created = det.candidates.map(function (c) { return incidentStore.createIncident(c); });
 res.json({ ok: true, dryRun: true, detection: det, persisted: persist, createdCount: created.length });
}));


// alerts CRUD + dry-run test
router.get('/alerts', wrap(function (req, res) { res.json({ ok: true, rules: alertRules.list() }); }));
router.post('/alerts', wrap(function (req, res) { const r = alertRules.create(req.body || {}); res.status(201).json({ ok:
true, rule: r }); }));
router.post('/alerts/test', wrap(function (req, res) {
 const body = req.body || {};
 const incidents = incidentStore.listIncidents().filter(function (i) { return i.state !== 'resolved'; });
 const type = body.outputType || 'dashboard_alert';
 const draft = alertFormatter.format(type, incidents);
 res.json({ ok: true, dryRun: true, live: false, outputType: type, draft: draft, note: 'Dry-run alert draft. Nothing was sent.' });
}));

// history + reports
router.get('/history', wrap(function (req, res) { res.json({ ok: true, events:
incidentStore.readHistory().events.slice(-200).reverse() }); }));
router.get('/report', wrap(function (req, res) {

 const incidents = incidentStore.listIncidents();
 res.json({ ok: true, health: incidentStore.getHealth(), summary: alertFormatter.summarize(incidents), owner:
owner.ownerDigest() });
}));
router.post('/report/generate', wrap(function (req, res) {
 const incidents = incidentStore.listIncidents();
 const md = alertFormatter.toMarkdown(incidents);
 const json = alertFormatter.toJson(incidents);
 res.json({ ok: true, dryRun: true, markdown: md.markdown, json: json });
}));


module.exports = router;
