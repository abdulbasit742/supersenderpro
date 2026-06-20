// lib/publicSaasFunnel/trialRequests.js
// Trial request + self-serve onboarding. Creates setup preview + tenant provisioning preview.
// Never creates a real tenant / subscription / invoice live by default.

const { config, load, save, newId, appendHistory } = require('./store');
const onboardingPreview = require('./onboardingPreview');
const tenantPreview = require('./tenantProvisionPreview');
const billing = require('./adapters/saasBillingAdapter');
const followups = require('./leadFollowupDrafts');
const leadStore = require('./leadStore');

const STATUSES = ['requested', 'review_needed', 'approved_draft', 'tenant_preview_created', 'activated_manual', 'rejected', 'archived'];
const FILE = () => config.paths.trialRequests;

function _all() { return load(FILE(), []); }
function _persist(l) { return save(FILE(), l); }
function clamp(v, n = 120) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim().slice(0, n); }

function create(raw = {}) {
  const leadId = clamp(raw.leadId, 60) || null;
  const lead = leadId ? leadStore.get(leadId) : null;
  const businessType = clamp(raw.businessType || (lead && lead.businessType) || 'custom', 60);
  const requestedPlan = clamp(raw.requestedPlan || raw.plan || 'free_trial', 40);
  const modulesRequested = Array.isArray(raw.modulesRequested || raw.modules)
    ? (raw.modulesRequested || raw.modules).slice(0, 30).map((m) => clamp(m, 60)) : [];

  const setupPreview = onboardingPreview.build({ businessType, goal: clamp(raw.goal, 60), modules: modulesRequested, planInterest: requestedPlan });
  const tenantProvisionDryRun = tenantPreview.build({ businessType, requestedPlan, modulesRequested, leadId });
  const billingDraft = billing.createTrialRequestDraft({ planId: requestedPlan, businessType, leadId });

  const trial = {
    id: newId('trial'),
    leadId,
    requestedPlan,
    businessType,
    selectedPreset: clamp(raw.selectedPreset || businessType, 60),
    modulesRequested,
    status: 'review_needed',
    setupPreview,
    tenantProvisionDryRun,
    billingDraft,
    reviewDraft: followups.generate(lead || { businessType, consentContact: true }, 'trial', { language: config.defaultLanguage }),
    createdAt: new Date().toISOString(),
  };

  const list = _all();
  list.push(trial);
  _persist(list);

  if (lead) {
    leadStore.update(lead.id, { status: 'trial_requested', interestedPlan: requestedPlan });
    leadStore.rescore(lead.id, { trialRequested: true });
  }
  appendHistory({ type: 'trial_requested', ref: trial.id, note: `${businessType}/${requestedPlan}` });
  return { ok: true, trialRequest: trial };
}

function get(id) { return _all().find((t) => t.id === id) || null; }
function list({ status, limit = 200 } = {}) {
  let items = _all();
  if (status) items = items.filter((t) => t.status === status);
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit);
}
function counts() {
  const items = _all();
  const byStatus = {};
  for (const t of items) byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  return { total: items.length, byStatus };
}

module.exports = { create, get, list, counts, STATUSES, _all };
