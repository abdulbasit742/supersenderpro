 'use strict';


 /**
     * Pilot Ops — Express router. Read-only aggregation + local/dry-run writes.
     * No real tenant creation, no billing activation, no live messaging, no full PII.
     *
     * Mount (inside marked hook):
     *     const pilotOpsRoutes = require('./routes/pilotOpsRoutes');
     *     app.use('/api/pilot-ops', pilotOpsRoutes);
     */

 const express = require('express');
 const router = express.Router();


 const guard = require('../lib/pilotOps/safetyGuard');
 const registry = require('../lib/pilotOps/pilotRegistry');
 const trialManager = require('../lib/pilotOps/trialManager');
 const checklist = require('../lib/pilotOps/onboardingChecklist');
 const setupProgress = require('../lib/pilotOps/setupProgress');
 const success = require('../lib/pilotOps/successScoring');
 const risk = require('../lib/pilotOps/riskScoring');
 const conversion = require('../lib/pilotOps/conversionAdvisor');
 const feedback = require('../lib/pilotOps/feedbackStore');
 const followup = require('../lib/pilotOps/followupDrafts');
 const ownerSummary = require('../lib/pilotOps/adapters/ownerCommandSummary');
 const kpiExport = require('../lib/pilotOps/adapters/kpiExportAdapter');
 const privacy = require('../lib/pilotOps/privacyGuard');
 const store = require('../lib/pilotOps/store');

 router.use(function (req, res, next) { if (!guard.enabled()) return res.status(404).json({ ok: false, error:
 'pilot_ops_disabled' }); next(); });
 function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
 'internal_error' }); } }; }


 // status
 router.get('/status', wrap(function (req, res) {
   res.json({ ok: true, feature: 'pilot-ops', enabled: guard.enabled(), dryRun: guard.dryRun(), requireConsent:
 guard.requireConsent(), tenantWrite: guard.allowTenantWrite(), billingWrite: guard.allowBillingWrite(), liveMessages:
 guard.allowLiveMessages(), store: registry.statusInfo(), feedback: feedback.statusInfo() });
 }));

// pilots CRUD
router.get('/pilots', wrap(function (req, res) { res.json({ ok: true, pilots: registry.list() }); }));
router.post('/pilots', wrap(function (req, res) { res.status(201).json({ ok: true, pilot: registry.create(req.body || {})
}); }));
router.get('/pilots/:id', wrap(function (req, res) { const p = registry.get(req.params.id); return p ? res.json({ ok:
true, pilot: p }) : res.status(404).json({ ok: false, error: 'not_found' }); }));
router.put('/pilots/:id', wrap(function (req, res) { const p = registry.update(req.params.id, req.body || {}); return p ?
res.json({ ok: true, pilot: p }) : res.status(404).json({ ok: false, error: 'not_found' }); }));

// onboarding
router.post('/pilots/:id/start-onboarding', wrap(function (req, res) {
 const p = registry.setStatus(req.params.id, 'onboarding_started'); if (!p) return res.status(404).json({ ok: false,
error: 'not_found' });
 const items = checklist.generate(req.params.id);
 res.json({ ok: true, pilot: p, checklist: items });
}));
router.get('/pilots/:id/checklist', wrap(function (req, res) { res.json({ ok: true, checklist:
checklist.get(req.params.id), progress: setupProgress.summarize(req.params.id) }); }));
router.post('/pilots/:id/checklist/:itemId/mark', wrap(function (req, res) {
 const item = checklist.mark(req.params.id, req.params.itemId, (req.body || {}).status, req.body || {});
 return item ? res.json({ ok: true, item: item, progress: setupProgress.summarize(req.params.id) }) :
res.status(404).json({ ok: false, error: 'not_found' });
}));


// scores
router.get('/pilots/:id/scores', wrap(function (req, res) { const p = registry.get(req.params.id); if (!p) return
res.status(404).json({ ok: false, error: 'not_found' }); res.json({ ok: true, successScore: p.successScore, riskScore:
p.riskScore }); }));
router.post('/pilots/:id/scores/run', wrap(function (req, res) {
 const p = registry.get(req.params.id); if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
 const signals = (req.body || {}).signals || {};
 const succ = success.compute(p, signals); const rsk = risk.compute(p, signals);
 const updated = registry.update(p.id, { successScore: succ.score, riskScore: rsk.score });
 res.json({ ok: true, success: succ, risk: rsk, pilot: updated });
}));


// conversion + follow-up
router.post('/pilots/:id/conversion-preview', wrap(function (req, res) { const p = registry.get(req.params.id); if (!p)
return res.status(404).json({ ok: false, error: 'not_found' }); res.json(Object.assign({ ok: true }, conversion.advise(p,
(req.body || {}).signals || {}))); }));
router.post('/pilots/:id/followup-draft', wrap(function (req, res) {
 const p = registry.get(req.params.id); if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
 const body = req.body || {};
 const draft = followup.generate(p, body.draftType || 'setup_reminder', { language: body.language, plan: body.plan,
percent: body.percent, days: body.days });
 res.json(Object.assign({ ok: draft.ok !== false }, draft));
}));


// trial helpers (dry-run)
router.post('/pilots/:id/trial/:action', wrap(function (req, res) {
 const a = req.params.action; const id = req.params.id;
 const map = { request: trialManager.request, approve: function (x) { return trialManager.approve(x, (req.body ||
{}).days); }, expire: trialManager.expire, cancel: trialManager.cancel, convert: trialManager.convert };
 if (!map[a]) return res.status(400).json({ ok: false, error: 'unknown_action' });
 const p = map[a](id);
 return p ? res.json({ ok: true, pilot: p }) : res.status(404).json({ ok: false, error: 'not_found' });

}));


// feedback
router.get('/feedback', wrap(function (req, res) { res.json({ ok: true, items: feedback.list() }); }));
router.post('/feedback', wrap(function (req, res) { res.status(201).json({ ok: true, item: feedback.create(req.body ||
{}) }); }));
router.get('/feedback/:id', wrap(function (req, res) { const f = feedback.get(req.params.id); return f ? res.json({ ok:
true, item: f }) : res.status(404).json({ ok: false, error: 'not_found' }); }));
router.put('/feedback/:id', wrap(function (req, res) { const f = feedback.update(req.params.id, req.body || {}); return f
? res.json({ ok: true, item: f }) : res.status(404).json({ ok: false, error: 'not_found' }); }));


// reports
router.get('/dashboard', wrap(function (req, res) {
 const pilots = registry.list();
 res.json({ ok: true, totals: {
   pilots: pilots.length,
   activeTrials: pilots.filter(function (p) { return ['active', 'active_dry_run'].indexOf(p.trialStatus) !== -1;
}).length,
   onboardingStuck: pilots.filter(function (p) { return ['setup_in_progress', 'waiting_customer',
'waiting_admin'].indexOf(p.onboardingStatus) !== -1; }).length,
   upgradeReady: pilots.filter(function (p) { return p.onboardingStatus === 'upgrade_ready'; }).length,
   highRisk: pilots.filter(function (p) { return (p.riskScore || 0) >= 60; }).length,
   feedbackOpen: feedback.list().filter(function (f) { return ['new', 'triaged'].indexOf(f.status) !== -1; }).length,
   trialExpiring: pilots.filter(function (p) { const d = trialManager.daysRemaining(p); return d != null && d <= 3;
}).length,
 }, owner: ownerSummary.build(), kpi: kpiExport.metrics() });
}));
router.get('/history', wrap(function (req, res) { res.json({ ok: true, events:
store.read(process.env.PILOT_OPS_HISTORY_PATH || 'data/pilot-ops-history.json', { events: []
}).events.slice(-200).reverse() }); }));
router.get('/doctor', wrap(function (req, res) {
 const pilots = registry.list();
 const issues = [];
 pilots.forEach(function (p) { if ((p.riskScore || 0) >= 60) issues.push({ pilot: p.businessName, issue: 'high risk',
score: p.riskScore }); });
 res.json({ ok: true, dryRun: true, pilots: pilots.length, issues: issues });
}));
router.post('/report/generate', wrap(function (req, res) { res.json({ ok: true, dryRun: true, kpi: kpiExport.metrics(),
owner: ownerSummary.build() }); }));


module.exports = router;
