'use strict';
/** Safe per-client summaries for a reseller. Business-name level only; no raw PII/chats/orders/payment refs. */
const resellers = require('./resellerRegistry');
const tenantAdapter = require('./tenantAdapter');
function list(resellerId) {
  const r = resellers.get(resellerId); if (!r) return { ok: false, errors: ['not_found'] };
  const clients = (r.assignedTenants || []).map((tid) => {
    const t = tenantAdapter.summary(tid);
    return {
      tenantId: tid,
      available: t.available,
      businessName: t.businessName || 'Client ' + String(tid).slice(-4),
      businessType: t.businessType || 'unknown',
      selectedPlan: t.selectedPlan || 'unknown',
      onboardingStatus: t.setupStatus || t.onboardingStatus || 'unknown',
      trialStatus: t.trialStatus || 'unknown',
      licenseStatusPreview: t.licenseStatus || 'preview',
      setupProgress: t.setupProgress != null ? t.setupProgress : 'unknown',
      supportStatus: t.supportStatus || 'none',
      usageWarningPreview: t.usageWarning || null,
      upgradeReadiness: t.upgradeReadiness || 'unknown',
    };
  });
  return { ok: true, clients, note: 'Business-name level previews only. No raw customer PII, chats, orders, or payment refs.' };
}
function get(resellerId, clientId) {
  const r = list(resellerId);
  if (!r.ok) return r;
  const c = r.clients.find((x) => x.tenantId === clientId);
  return c ? { ok: true, client: c } : { ok: false, errors: ['client_not_found'] };
}
module.exports = { list, get };
