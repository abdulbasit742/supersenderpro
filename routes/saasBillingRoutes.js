'use strict';
/**
 * routes/saasBillingRoutes.js — SaaS Billing + Tenant License + Usage Metering API.
 * Mounted in server.js at /api/saas-billing (see SAAS BILLING HOOK).
 *
 * Safety:
 *  - Read endpoints are open (no secrets in responses; all output sanitized).
 *  - Write endpoints require an admin secret (x-admin-secret header / ?secret=) matching
 *    SAAS_BILLING_ADMIN_SECRET / ADMIN_TOKEN / CHANNEL_ADMIN_SECRET when configured.
 *    If none configured, allowed in dev with a warning (matches repo convention).
 *  - No real payment capture. No live suspension by default. Warn-only enforcement.
 */
const express = require('express');
const S = require('../lib/saasBilling');
const { sanitize } = require('../lib/saasBilling/privacy');

const router = express.Router();

function adminGuard(req, res, next) {
  if (!S.config.requireAdmin) return next();
  const configured = process.env.SAAS_BILLING_ADMIN_SECRET || process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) { console.warn('[SaaSBilling] no admin secret set — write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized', fix: 'Send x-admin-secret matching SAAS_BILLING_ADMIN_SECRET' });
}

const ok = (res, d) => res.json({ success: true, ...sanitizeWrap(d) });
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
function sanitizeWrap(d) { try { return sanitize(d); } catch { return d; } }
const tid = (req) => req.params.tenantId || (req.body && req.body.tenantId) || req.query.tenantId || 'default';

/* ---------------- Status / Doctor ---------------- */
router.get('/status', (req, res) => { try { ok(res, { status: S.billingStatus.overview() }); } catch (e) { fail(res, e); } });
router.get('/doctor', (req, res) => { try { ok(res, { doctor: S.doctor.run() }); } catch (e) { fail(res, e); } });

/* ---------------- Plans ---------------- */
router.get('/plans', (req, res) => { try { ok(res, { plans: S.planRegistry.getPlans() }); } catch (e) { fail(res, e); } });
router.get('/plans/:id', (req, res) => { try { const p = S.planRegistry.getPlan(req.params.id); return p ? ok(res, { plan: p }) : fail(res, new Error('plan not found'), 404); } catch (e) { fail(res, e); } });
router.post('/plans', adminGuard, (req, res) => {
  try { if (!S.safetyGuard.canWritePlans()) return res.status(403).json({ success: false, error: 'Plan write disabled', fix: 'Set SAAS_BILLING_ALLOW_PLAN_WRITE=true' }); ok(res, { plan: S.planRegistry.upsertPlan(req.body || {}) }); } catch (e) { fail(res, e); }
});
router.put('/plans/:id', adminGuard, (req, res) => {
  try { if (!S.safetyGuard.canWritePlans()) return res.status(403).json({ success: false, error: 'Plan write disabled', fix: 'Set SAAS_BILLING_ALLOW_PLAN_WRITE=true' }); ok(res, { plan: S.planRegistry.upsertPlan({ ...req.body, id: req.params.id }) }); } catch (e) { fail(res, e); }
});
router.delete('/plans/:id', adminGuard, (req, res) => {
  try { if (!S.safetyGuard.canWritePlans()) return res.status(403).json({ success: false, error: 'Plan write disabled', fix: 'Set SAAS_BILLING_ALLOW_PLAN_WRITE=true' }); const p = S.planRegistry.deactivatePlan(req.params.id); return p ? ok(res, { plan: p, note: 'soft-deactivated (not hard-deleted)' }) : fail(res, new Error('plan not found'), 404); } catch (e) { fail(res, e); }
});

/* ---------------- Tenants / Licenses ---------------- */
router.get('/tenants', (req, res) => { try { ok(res, { tenants: S.tenantPlans.listTenants() }); } catch (e) { fail(res, e); } });
router.get('/tenants/:tenantId/billing', (req, res) => { try { ok(res, { billing: S.billingStatus.tenantStatus(req.params.tenantId) }); } catch (e) { fail(res, e); } });
router.get('/tenants/:tenantId/license', (req, res) => { try { ok(res, { license: S.licenseEngine.getLicense(req.params.tenantId) }); } catch (e) { fail(res, e); } });
router.post('/tenants/:tenantId/license', adminGuard, (req, res) => { try { ok(res, { license: S.licenseEngine.issueLicense(req.params.tenantId, (req.body && req.body.planId) || S.tenantPlans.getTenantPlanId(req.params.tenantId), req.body || {}) }); } catch (e) { fail(res, e); } });
router.put('/tenants/:tenantId/license', adminGuard, (req, res) => { try { ok(res, { license: S.licenseEngine.updateLicense(req.params.tenantId, req.body || {}) }); } catch (e) { fail(res, e); } });

/* ---------------- Usage ---------------- */
router.get('/usage', (req, res) => { try { ok(res, { usage: S.usageMeter.summaryByTenant(req.query.period || 'monthly') }); } catch (e) { fail(res, e); } });
router.post('/usage/record', adminGuard, (req, res) => { try { ok(res, { event: S.usageMeter.record(req.body || {}) }); } catch (e) { fail(res, e); } });
router.get('/usage/:tenantId', (req, res) => { try { ok(res, { usage: S.usageMeter.getUsage(req.params.tenantId, req.query.period || 'monthly'), periods: S.usageMeter.getAllPeriods(req.params.tenantId) }); } catch (e) { fail(res, e); } });
router.post('/quota/check', (req, res) => { try { const b = req.body || {}; ok(res, { quota: b.metric ? S.quotaChecker.check(b) : S.quotaChecker.checkTenant(tid(req)) }); } catch (e) { fail(res, e); } });

/* ---------------- Invoices ---------------- */
router.get('/invoices', (req, res) => { try { const all = S.invoiceStore.all(); ok(res, { invoices: req.query.tenantId ? all.filter((i) => String(i.tenantId) === String(req.query.tenantId)) : all }); } catch (e) { fail(res, e); } });
router.post('/invoices', adminGuard, (req, res) => { try { ok(res, { invoice: S.invoiceBuilder.createDraft(req.body || {}) }); } catch (e) { fail(res, e); } });
router.get('/invoices/:id', (req, res) => { try { const i = S.invoiceStore.getById(req.params.id); return i ? ok(res, { invoice: i }) : fail(res, new Error('invoice not found'), 404); } catch (e) { fail(res, e); } });
router.put('/invoices/:id', adminGuard, (req, res) => { try { const i = S.invoiceStore.getById(req.params.id); if (!i) return fail(res, new Error('invoice not found'), 404); if ((req.body || {}).status === 'issued') return ok(res, { invoice: S.invoiceBuilder.issue(req.params.id) }); Object.assign(i, { notes: (req.body && req.body.notes) || i.notes }); S.invoiceStore.upsert(i); ok(res, { invoice: i }); } catch (e) { fail(res, e); } });
router.post('/invoices/:id/mark-paid-review', adminGuard, (req, res) => { try { ok(res, S.invoiceBuilder.markPaidForReview(req.params.id, req.body || {})); } catch (e) { fail(res, e); } });
router.post('/invoices/:id/cancel', adminGuard, (req, res) => { try { ok(res, { invoice: S.invoiceBuilder.cancel(req.params.id, (req.body && req.body.reason) || '') }); } catch (e) { fail(res, e); } });

/* ---------------- Feature gate ---------------- */
router.post('/feature/check', (req, res) => { try { ok(res, { decision: S.featureGate.check(req.body || {}) }); } catch (e) { fail(res, e); } });
router.post('/feature/preview-enforcement', (req, res) => { try { ok(res, { preview: S.featureGate.previewEnforcement(req.body || {}) }); } catch (e) { fail(res, e); } });

/* ---------------- Reseller ---------------- */
router.get('/resellers', (req, res) => { try { ok(res, S.resellerManager.listResellers()); } catch (e) { fail(res, e); } });
router.post('/resellers', adminGuard, (req, res) => { try { ok(res, { reseller: S.resellerManager.registerReseller(req.body || {}) }); } catch (e) { fail(res, e); } });
router.get('/resellers/:id', (req, res) => { try { const r = S.resellerStore.getReseller(req.params.id); return r ? ok(res, { reseller: r }) : fail(res, new Error('reseller not found'), 404); } catch (e) { fail(res, e); } });
router.post('/resellers/:id/assign-tenant', adminGuard, (req, res) => { try { ok(res, { reseller: S.resellerManager.assignTenant(req.params.id, (req.body && req.body.tenantId) || 'default') }); } catch (e) { fail(res, e); } });
router.get('/resellers/:id/commissions', (req, res) => { try { ok(res, { commissions: S.resellerManager.commissions(req.params.id) }); } catch (e) { fail(res, e); } });

/* ---------------- Plan change ---------------- */
router.post('/upgrade/preview', (req, res) => { try { ok(res, { preview: S.planChange.preview(req.body || {}) }); } catch (e) { fail(res, e); } });
router.post('/upgrade/request', adminGuard, (req, res) => { try { ok(res, { request: S.planChange.requestChange(req.body || {}) }); } catch (e) { fail(res, e); } });
router.post('/upgrade/apply', adminGuard, (req, res) => { try { ok(res, { result: S.planChange.apply(req.body || {}) }); } catch (e) { fail(res, e); } });

/* ---------------- Reports / History ---------------- */
router.get('/reports/monthly', (req, res) => { try { ok(res, { report: S.reportBuilder.all() }); } catch (e) { fail(res, e); } });
router.get('/history', (req, res) => { try { const h = S.store.readJSON(S.config.paths.history, { history: [] }); ok(res, { history: (h.history || []).slice(-Number(req.query.limit || 100)) }); } catch (e) { fail(res, e); } });

module.exports = router;
