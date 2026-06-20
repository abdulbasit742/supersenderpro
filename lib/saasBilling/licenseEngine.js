// lib/saasBilling/licenseEngine.js — Issue, renew, and transition tenant licenses.
// Never exposes full keys. Never hard-deletes. Never auto-suspends a live business
// unless config.effective.liveSuspension is explicitly enabled.

const { config } = require('./config');
const store = require('./store');
const licenseStore = require('./licenseStore');
const keys = require('./licenseKeys');
const validator = require('./licenseValidator');
const planRegistry = require('./planRegistry');
const tenantPlans = require('./tenantPlans');
const safetyGuard = require('./safetyGuard');

function addDays(date, days) {
  const d = new Date(date); d.setDate(d.getDate() + Number(days || 0)); return d.toISOString();
}

// Build the public-safe view of a license (masked key, derived status, no hashes).
function publicView(license) {
  if (!license) return null;
  const summary = validator.summarize(license);
  return {
    id: license.id,
    tenantId: license.tenantId,
    planId: license.planId,
    status: summary.status,
    entitled: summary.entitled,
    licenseKeyMasked: license.licenseKeyMasked,
    startsAt: license.startsAt,
    expiresAt: license.expiresAt,
    trialEndsAt: license.trialEndsAt,
    graceEndsAt: license.graceEndsAt,
    renewalDueAt: license.renewalDueAt,
    seats: license.seats,
    featureOverrides: license.featureOverrides || {},
    limitOverrides: license.limitOverrides || {},
    notes: license.notes || '',
    createdAt: license.createdAt,
    updatedAt: license.updatedAt,
  };
}

// Issue (or re-issue) a license for a tenant on a given plan.
function issueLicense(tenantId, planId, opts = {}) {
  const tid = tenantPlans.normalizeTenantId(tenantId);
  const plan = planRegistry.getPlan(planId);
  if (!plan) throw new Error(`unknown planId: ${planId}`);

  const now = new Date();
  const issued = keys.issue();
  const isTrial = (plan.trialDays || 0) > 0 && opts.startTrial !== false && !['lifetime', 'enterprise'].includes(plan.tier);
  const isLifetime = plan.tier === 'lifetime';

  const trialEndsAt = isTrial ? addDays(now, plan.trialDays) : null;
  const cycleDays = plan.billingCycle === 'annual' ? 365 : 30;
  const expiresAt = isLifetime ? null : addDays(now, isTrial ? plan.trialDays : cycleDays);
  const graceEndsAt = isLifetime ? null : addDays(expiresAt || now, config.defaultGraceDays);

  const license = {
    id: store.genId('lic'),
    tenantId: tid,
    planId,
    status: isLifetime ? 'lifetime' : (isTrial ? 'trial' : 'active'),
    licenseKeyMasked: issued.masked,
    licenseKeyHash: issued.hash,             // stored for verification, never returned
    startsAt: now.toISOString(),
    expiresAt,
    trialEndsAt,
    graceEndsAt,
    renewalDueAt: expiresAt,
    seats: opts.seats || plan.limits.teamMembers || 1,
    featureOverrides: opts.featureOverrides || {},
    limitOverrides: opts.limitOverrides || {},
    notes: opts.notes || '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  licenseStore.upsert(license);
  tenantPlans.assignTenantPlan(tid, planId, { source: 'license-engine' });
  // Return public view only — the plaintext key (issued.plainOnceForDelivery) is intentionally dropped.
  return publicView(license);
}

function getLicense(tenantId) {
  const lic = licenseStore.getByTenant(tenantPlans.normalizeTenantId(tenantId));
  return lic ? publicView(lic) : null;
}

// Apply a non-destructive update (overrides, notes, plan change, renewal).
function updateLicense(tenantId, patch = {}) {
  const raw = licenseStore.getByTenant(tenantPlans.normalizeTenantId(tenantId));
  if (!raw) throw new Error('license not found');
  const allowed = ['planId', 'seats', 'featureOverrides', 'limitOverrides', 'notes', 'expiresAt', 'renewalDueAt', 'trialEndsAt', 'graceEndsAt'];
  allowed.forEach((k) => { if (patch[k] !== undefined) raw[k] = patch[k]; });

  // status transitions are guarded: never suspend live unless allowed
  if (patch.status) {
    if (patch.status === 'suspended' && !safetyGuard.canSuspendTenant()) {
      raw.notes = `${raw.notes || ''} [suspend requested ${store.nowIso()} — blocked: live suspension disabled]`.trim();
    } else if (validator.STATUSES.includes(patch.status)) {
      raw.status = patch.status;
    }
  }
  raw.updatedAt = store.nowIso();
  licenseStore.upsert(raw);
  if (patch.planId) tenantPlans.assignTenantPlan(raw.tenantId, patch.planId, { source: 'license-update' });
  return publicView(raw);
}

function renewLicense(tenantId, days) {
  const raw = licenseStore.getByTenant(tenantPlans.normalizeTenantId(tenantId));
  if (!raw) throw new Error('license not found');
  const plan = planRegistry.getPlan(raw.planId);
  const cycleDays = days || (plan && plan.billingCycle === 'annual' ? 365 : 30);
  const base = raw.expiresAt && Date.parse(raw.expiresAt) > Date.now() ? raw.expiresAt : new Date().toISOString();
  raw.expiresAt = addDays(base, cycleDays);
  raw.graceEndsAt = addDays(raw.expiresAt, config.defaultGraceDays);
  raw.renewalDueAt = raw.expiresAt;
  raw.status = 'active';
  raw.updatedAt = store.nowIso();
  licenseStore.upsert(raw);
  return publicView(raw);
}

// Ensure a tenant has a license; auto-issue a trial if none (safe, local only).
function ensureLicense(tenantId) {
  const existing = getLicense(tenantId);
  if (existing) return existing;
  return issueLicense(tenantId, tenantPlans.getTenantPlanId(tenantId), { startTrial: true });
}

module.exports = { issueLicense, getLicense, updateLicense, renewLicense, ensureLicense, publicView, validator };
