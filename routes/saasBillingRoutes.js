 'use strict';

 /**
  * SaaS Billing — Express router. Dry-run / preview only. No real charge, no payment
  * gateway call, no invoice send, no external calls, no secrets/full PII.
  *
  * Mount (inside marked hook):
  *     const saasBillingRoutes = require('./routes/saasBillingRoutes');
  *     app.use('/api/saas-billing', saasBillingRoutes);
  */

 const express = require('express');
 const router = express.Router();

 const catalog = require('../lib/saasBilling/planCatalog');
 const subscription = require('../lib/saasBilling/subscriptionModel');
 const usageMeter = require('../lib/saasBilling/usageMeter');
 const usageEvents = require('../lib/saasBilling/usageEvents');
 const quota = require('../lib/saasBilling/quotaChecker');
 const entitlements = require('../lib/saasBilling/entitlementService');
 const summary = require('../lib/saasBilling/billingSummary');
 const upgrade = require('../lib/saasBilling/upgradePreview');


 function enabled() { return String(process.env.SAAS_BILLING_ENABLED || 'true').toLowerCase() !== 'false'; }
 router.use(function (req, res, next) { if (!enabled()) return res.status(404).json({ ok: false, error:
 'saas_billing_disabled' }); next(); });
 function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
 'internal_error' }); } }; }
 function tenant(req) { return (req.query && req.query.tenantId) || (req.body && req.body.tenantId) || 'preview'; }

 router.get('/status', wrap(function (req, res) {
   res.json({ ok: true, feature: 'saas-billing', dryRun: true, liveActionsEnabled: false, livePayment: false, store:
 subscription.statusInfo(), meters: catalog.METERS, plans: catalog.order() });
 }));

 // plans
 router.get('/plans', wrap(function (req, res) { res.json({ ok: true, plans: catalog.list() }); }));
 router.get('/plans/:id', wrap(function (req, res) { const p = catalog.get(req.params.id); return p ? res.json({ ok: true,
 plan: p }) : res.status(404).json({ ok: false, error: 'not_found' }); }));

 // subscription + usage
 router.get('/subscription', wrap(function (req, res) { res.json({ ok: true, subscription:
 subscription.getForTenant(tenant(req)) }); }));
 router.get('/usage', wrap(function (req, res) { res.json(usageMeter.usage(tenant(req))); }));
 router.post('/usage/record-preview', wrap(function (req, res) { const b = req.body || {};
 res.json(usageMeter.recordPreview(tenant(req), b.meter, b.amount)); }));

// quota + entitlements
router.post('/quota/check-preview', wrap(function (req, res) { const b = req.body || {};
res.json(quota.checkPreview(tenant(req), b.meter, b.requested)); }));
router.post('/entitlements/check-preview', wrap(function (req, res) { const b = req.body || {};
res.json(entitlements.checkPreview(tenant(req), b.feature, b.planId)); }));

// events + summary + upgrade
router.get('/usage-events', wrap(function (req, res) { const limit = parseInt(req.query.limit, 10); res.json({ ok: true,
events: usageEvents.list(Number.isFinite(limit) ? limit : 50), status: usageEvents.status() }); }));
router.get('/summary', wrap(function (req, res) { const admin = (req.query && req.query.admin) === 'true'; res.json(admin
? summary.adminOverview() : summary.tenantSummary(tenant(req))); }));
router.post('/upgrade-preview', wrap(function (req, res) { const b = req.body || {};
res.json(upgrade.preview(tenant(req), b.targetPlan || b.targetPlanId)); }));

module.exports = router;
