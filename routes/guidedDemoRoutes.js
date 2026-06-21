'use strict';
/**
 * routes/guidedDemoRoutes.js
 * Express Router for the Guided Demo Journey center. Read-only / preview-only, dry-run.
 * No external calls, no live sends/payments, no secrets/full PII. Does not crash if data missing.
 */
const express = require('express');
const router = express.Router();
const guided = require('../lib/guidedDemo');
const registry = require('../lib/guidedDemo/demoJourneyRegistry');
const stepRunner = require('../lib/guidedDemo/demoStepRunner');
const checklist = require('../lib/guidedDemo/demoAcceptanceChecklist');
const readiness = require('../lib/guidedDemo/demoReadinessScoring');
const report = require('../lib/guidedDemo/demoReportBuilder');
const ok = (res, data) => res.json(Object.assign({ ok: true }, data));
const bad = (res, code, errors) => res.status(code).json({ ok: false, errors });


const SCRIPTS = {
  investor: 'Open with the safety story: everything is dry-run + sample data. Walk the 8 investor steps in order; end on the readiness score.',
  business_owner: 'Lead with day-to-day value: chats, replies, orders, support, a campaign draft, then the owner brief.',
     agency: 'Show the reseller portal, client previews (no raw PII), team roles, tenant isolation, commission preview.',
     developer: 'Show API surface, mock webhook delivery, scoped keys + RBAC, redacted audit events.',
     qa: 'Run the QA journey: demo status, export check, mock gateway, route/page status, privacy scan, acceptance report.',
};


router.get('/status', (req, res) => ok(res, guided.status()));
router.get('/journeys', (req, res) => ok(res, { journeys: registry.list() }));
router.get('/journeys/:id', (req, res) => { const j = registry.get(req.params.id); return j ? ok(res, { journey: j }) :
bad(res, 404, ['not_found']); });
router.post('/journeys/:id/run', (req, res) => { const r = stepRunner.run(req.params.id); return r.ok ? ok(res, r) :
bad(res, 404, r.errors); });
router.get('/checklist', (req, res) => ok(res, { checklist: checklist.run() }));
router.post('/checklist/run', (req, res) => ok(res, { checklist: checklist.run() }));
router.get('/readiness', (req, res) => ok(res, { readiness: readiness.run() }));
router.post('/report/generate', (req, res) => ok(res, { report: report.generate() }));
router.get('/script/:audience', (req, res) => ok(res, { audience: req.params.audience, script:
SCRIPTS[req.params.audience] || 'No script for this audience.' }));
module.exports = router;
