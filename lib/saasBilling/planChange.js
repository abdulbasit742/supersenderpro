// lib/saasBilling/planChange.js — Safe plan upgrade/downgrade flow.
// Default is PREVIEW / dry-run with approval required. Applying a change locally
// requires opts.approved === true. Downgrades are scheduled for next renewal.

const { config } = require('./config');
const store = require('./store');
const tenantPlans = require('./tenantPlans');
const planRegistry = require('./planRegistry');
const licenseEngine = require('./licenseEngine');
const upgradeAdvisor = require('./upgradeAdvisor');

function diff(fromPlan, toPlan) {
  const featureChanges = {};
  Object.keys(toPlan.features).forEach((f) => {
    if (!!fromPlan.features[f] !== !!toPlan.features[f]) featureChanges[f] = { from: !!fromPlan.features[f], to: !!toPlan.features[f] };
  });
  const limitChanges = {};
  Object.keys(toPlan.limits).forEach((k) => {
    if ((fromPlan.limits[k] || 0) !== (toPlan.limits[k] || 0)) limitChanges[k] = { from: fromPlan.limits[k], to: toPlan.limits[k] };
  });
  return { featureChanges, limitChanges, priceDelta: (toPlan.price || 0) - (fromPlan.price || 0) };
}

function preview({ tenantId, toPlanId } = {}) {
  const tid = tenantPlans.normalizeTenantId(tenantId);
  const from = tenantPlans.getTenantPlan(tid);
  const to = planRegistry.getPlan(toPlanId);
  if (!to) throw new Error(`unknown planId: ${toPlanId}`);
  const direction = (to.price || 0) >= (from.price || 0) ? 'upgrade' : 'downgrade';
  return {
    tenantId: tid, from: from.id, to: to.id, direction,
    dryRun: config.dryRun, approvalRequired: true,
    applyImmediately: direction === 'upgrade',
    scheduledFor: direction === 'downgrade' ? 'next_renewal' : 'immediate',
    changes: diff(from, to),
  };
}

function recommend(tenantId) { return upgradeAdvisor.recommend(tenantId); }

// Record an approval request (does not change the plan).
function requestChange({ tenantId, toPlanId, requestedBy = 'admin' } = {}) {
  const p = preview({ tenantId, toPlanId });
  const data = store.readJSON(config.paths.store, null) || {};
  if (!Array.isArray(data.planChangeRequests)) data.planChangeRequests = [];
  const req = { id: store.genId('chg'), ...p, requestedBy, status: 'pending_approval', createdAt: store.nowIso() };
  data.planChangeRequests.push(req);
  store.writeJSON(config.paths.store, data);
  return req;
}

// Apply a change locally. Requires explicit approval. Upgrades apply now; downgrades scheduled.
function apply({ tenantId, toPlanId, approved = false } = {}) {
  const p = preview({ tenantId, toPlanId });
  if (!approved) return { ...p, applied: false, reason: 'approval required (approved=false)' };
  if (p.direction === 'downgrade') {
    // schedule rather than strip access immediately
    const lic = licenseEngine.getLicense(tenantId);
    licenseEngine.updateLicense(tenantId, { notes: `${(lic && lic.notes) || ''} [downgrade to ${toPlanId} scheduled at renewal ${store.nowIso()}]`.trim() });
    return { ...p, applied: false, scheduled: true, reason: 'downgrade scheduled for next renewal' };
  }
  const updated = licenseEngine.updateLicense(tenantId, { planId: toPlanId });
  return { ...p, applied: true, license: updated };
}

function cancelSubscription({ tenantId } = {}) {
  // Local cancellation only; never strips a live business mid-cycle.
  const lic = licenseEngine.getLicense(tenantId);
  if (!lic) throw new Error('license not found');
  licenseEngine.updateLicense(tenantId, { notes: `${lic.notes || ''} [cancellation requested ${store.nowIso()} — active until ${lic.expiresAt || 'cycle end'}]`.trim() });
  return { tenantId: lic.tenantId, status: 'cancellation_scheduled', activeUntil: lic.expiresAt };
}

module.exports = { preview, recommend, requestChange, apply, cancelSubscription, diff };
