// lib/publicSaasFunnel/safetyGuard.js
// Central guard that decides whether a potentially-live action is permitted.
// Default posture: everything is dry-run / draft-only. Real actions require explicit env flags.

const { config } = require('./store');

// Returns { allowed, dryRun, reason } for a named live action.
function guard(action) {
  const decisions = {
    tenant_write: config.allowTenantWrite,
    crm_write: config.allowCrmWrite,
    live_email: config.allowLiveEmail,
    live_whatsapp: config.allowLiveWhatsapp,
    capture_payment: false,        // never allowed from the public funnel
    activate_license: false,       // never auto-activate
    create_subscription: false,    // draft only
  };
  const explicitlyAllowed = decisions[action] === true;
  // Global dry-run forces everything to draft regardless of individual flags.
  const allowed = explicitlyAllowed && !config.dryRun;
  return {
    action,
    allowed,
    dryRun: !allowed,
    reason: allowed
      ? `action '${action}' explicitly enabled`
      : config.dryRun
        ? `global dryRun is ON — '${action}' downgraded to draft/preview`
        : `'${action}' not enabled (safe default)`,
  };
}

// Wrap a would-be live operation. If not allowed, returns a draft envelope instead of executing.
function runOrDraft(action, draftPayload, liveFn) {
  const g = guard(action);
  if (!g.allowed) {
    return { executed: false, dryRun: true, action, reason: g.reason, draft: draftPayload };
  }
  try {
    const result = typeof liveFn === 'function' ? liveFn() : null;
    return { executed: true, dryRun: false, action, result };
  } catch (e) {
    return { executed: false, dryRun: true, action, error: e.message, draft: draftPayload };
  }
}

function safetyStatus() {
  return {
    enabled: config.enabled,
    dryRun: config.dryRun,
    requireConsent: config.requireConsent,
    allowTenantWrite: config.allowTenantWrite,
    allowCrmWrite: config.allowCrmWrite,
    allowLiveEmail: config.allowLiveEmail,
    allowLiveWhatsapp: config.allowLiveWhatsapp,
    exportRawLeads: config.exportRawLeads,
    capturePayment: false,
    activateLicense: false,
  };
}

module.exports = { guard, runOrDraft, safetyStatus };
