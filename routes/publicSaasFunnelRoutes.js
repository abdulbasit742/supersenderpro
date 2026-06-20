// routes/publicSaasFunnelRoutes.js
// Express router for the Public SaaS Launch Funnel. Mounted at /api/public-funnel.
// Public routes: validated input, redacted output, no PII/secrets exposed.
// Admin routes: x-admin-secret / ?secret= (PUBLIC_FUNNEL_ADMIN_SECRET|CHANNEL_ADMIN_SECRET|ADMIN_TOKEN).
//   If no admin secret is configured OR not provided, admin endpoints return REDACTED data only.
// Nothing here sends WhatsApp/email, captures payment, or creates live tenants by default.

const express = require('express');
const router = express.Router();

const F = require('../lib/publicSaasFunnel');
const privacy = require('../lib/publicSaasFunnel/privacyGuard');

function safe(fn) {
  return async (req, res) => {
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) {
        // Defensive leak scan on every response body.
        if (privacy.hasLeak(out)) {
          return res.status(500).json({ ok: false, error: 'response_blocked_pii_leak' });
        }
        res.json(out);
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message || 'public_funnel_error' });
    }
  };
}

// Returns true when a valid admin secret is provided. If no secret configured, returns false
// (so admin endpoints fall back to redacted output rather than exposing data).
function isAdmin(req) {
  const configured = process.env.PUBLIC_FUNNEL_ADMIN_SECRET || process.env.CHANNEL_ADMIN_SECRET || process.env.ADMIN_TOKEN || '';
  if (!configured) return false;
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  return provided && provided === configured;
}

// ---------- Public: status / config / catalog ----------
router.get('/status', safe(() => ({
  ok: true,
  enabled: F.config.enabled,
  dryRun: F.config.dryRun,
  requireConsent: F.config.requireConsent,
  safety: F.safetyGuard.safetyStatus(),
})));

router.get('/config', safe(() => ({ ok: true, config: F.funnelConfig.get() })));
router.get('/features', safe(() => ({ ok: true, features: F.pageRegistry.features() })));
router.get('/use-cases', safe(() => ({ ok: true, useCases: F.pageRegistry.useCases() })));
router.get('/plans', safe(() => ({ ok: true, ...F.adapters.saasBilling.plans() })));

// ---------- Lead capture ----------
router.post('/leads', safe((req) => {
  const sourcePage = (req.body && req.body.sourcePage) || 'landing';
  const r = F.leadStore.create(req.body || {}, sourcePage, {});
  if (!r.ok) return { ok: false, errors: r.errors };
  // Public response is heavily redacted — never return masked contact to the public.
  return { ok: true, lead: privacy.publicLeadView(r.lead), message: 'Thanks! Our team will follow up.' };
}));

router.get('/leads', safe((req) => {
  const admin = isAdmin(req);
  const items = F.leadStore.list({ status: req.query.status, grade: req.query.grade });
  return {
    ok: true,
    admin,
    count: items.length,
    leads: items.map((l) => (admin ? privacy.adminLeadView(l) : privacy.publicLeadView(l))),
  };
}));

router.get('/leads/:id', safe((req) => {
  const lead = F.leadStore.get(req.params.id);
  if (!lead) return { ok: false, error: 'not_found' };
  const admin = isAdmin(req);
  return { ok: true, admin, lead: admin ? privacy.adminLeadView(lead) : privacy.publicLeadView(lead) };
}));

router.put('/leads/:id', safe((req) => {
  if (!isAdmin(req)) return { ok: false, error: 'admin_required' };
  const r = F.leadStore.update(req.params.id, req.body || {});
  return r.ok ? { ok: true, lead: privacy.adminLeadView(r.lead) } : { ok: false, errors: r.errors };
}));

router.post('/leads/:id/score', safe((req) => {
  const r = F.leadStore.rescore(req.params.id, (req.body && req.body.signals) || {});
  return r.ok ? { ok: true, scoring: r.scoring } : { ok: false, errors: r.errors };
}));

router.post('/leads/:id/followup-draft', safe((req) => {
  const lead = F.leadStore.get(req.params.id);
  if (!lead) return { ok: false, error: 'not_found' };
  const type = (req.body && req.body.type) || 'whatsapp';
  const draft = F.leadFollowupDrafts.generate(lead, type, { language: (req.body && req.body.language) });
  return { ok: true, draft };
}));

// ---------- Demo ----------
router.post('/demo-request', safe((req) => {
  const r = F.demoRequests.create(req.body || {});
  if (!r.ok) return { ok: false, errors: r.errors };
  return { ok: true, demoRequest: { id: r.demoRequest.id, status: r.demoRequest.status }, message: 'Demo request received. We will propose a time.' };
}));

router.get('/demo-requests', safe((req) => {
  const admin = isAdmin(req);
  const items = F.demoRequests.list({ status: req.query.status });
  return { ok: true, admin, count: items.length, demoRequests: items.map((d) => admin ? d : { id: d.id, businessType: d.businessType, status: d.status, createdAt: d.createdAt }) };
}));

router.post('/demo-requests/:id/followup-draft', safe((req) => {
  const r = F.demoRequests.followupDraft(req.params.id, { language: (req.body && req.body.language) });
  return r.ok ? { ok: true, draft: r.draft } : { ok: false, errors: r.errors };
}));

// ---------- Trial / onboarding ----------
router.post('/trial-request', safe((req) => {
  const r = F.trialRequests.create(req.body || {});
  if (!r.ok) return { ok: false, errors: r.errors };
  return { ok: true, trialRequest: { id: r.trialRequest.id, status: r.trialRequest.status, requestedPlan: r.trialRequest.requestedPlan }, setupPreview: r.trialRequest.setupPreview, message: 'Trial request received (review needed). Nothing was activated.' };
}));

router.get('/trial-requests', safe((req) => {
  const admin = isAdmin(req);
  const items = F.trialRequests.list({ status: req.query.status });
  return { ok: true, admin, count: items.length, trialRequests: items.map((t) => admin ? t : { id: t.id, requestedPlan: t.requestedPlan, businessType: t.businessType, status: t.status, createdAt: t.createdAt }) };
}));

router.post('/onboarding/preview', safe((req) => {
  const b = req.body || {};
  return { ok: true, preview: F.onboardingPreview.build({ businessType: b.businessType, goal: b.goal, modules: b.modules || [], planInterest: b.planInterest }) };
}));

router.post('/tenant/preview', safe((req) => {
  const b = req.body || {};
  return { ok: true, preview: F.tenantProvisionPreview.build({ businessType: b.businessType, requestedPlan: b.requestedPlan, modulesRequested: b.modules || [], leadId: b.leadId }) };
}));

// ---------- Reports ----------
router.get('/kpis', safe(() => ({
  ok: true,
  kpis: F.adapters.kpiCommand.buildKpis({ leads: F.leadStore._all(), demoRequests: F.demoRequests._all(), trialRequests: F.trialRequests._all() }),
})));

router.post('/report/generate', safe((req) => {
  const admin = isAdmin(req);
  const wantRaw = admin && F.config.exportRawLeads && (req.body && req.body.raw === true);
  const format = (req.body && req.body.format) || 'markdown';
  if (wantRaw) {
    // Even when explicitly allowed, the funnel only stores masked data — so "raw" = admin view.
    return { ok: true, format, report: F.leadStore.exportRedacted(format), note: 'Only masked data is stored; no raw PII exists to export.' };
  }
  return { ok: true, format, report: F.leadStore.exportRedacted(format), note: 'Redacted export (default).' };
}));

router.get('/history', safe((req) => ({ ok: true, history: F.store.getHistory(parseInt(req.query.limit, 10) || 100) })));

router.get('/doctor', safe(() => ({ ok: true, doctor: F.doctor.run() })));

module.exports = router;
