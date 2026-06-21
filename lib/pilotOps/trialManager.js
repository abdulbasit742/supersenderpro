 'use strict';

 /**
     * Pilot Ops — trial lifecycle. Trials are dry-run by default: approving a trial
     * sets 'approved_draft' / 'active_dry_run' unless live writes are explicitly enabled.
     * Never activates real billing.
     */


 const registry = require('./pilotRegistry');
 const guard = require('./safetyGuard');


 const TRIAL_STATUSES = ['not_started', 'requested', 'approved_draft', 'active_dry_run', 'active', 'expiring_soon',
 'expired', 'converted', 'cancelled'];
 const DEFAULT_TRIAL_DAYS = parseInt(process.env.PILOT_OPS_TRIAL_DAYS, 10) || 14;


 function request(pid) {
   const p = registry.get(pid); if (!p) return null;
      return registry.update(pid, { trialStatus: 'requested', onboardingStatus: 'trial_requested' });
 }

 // Approve: dry-run by default. Live 'active' only if billing/tenant gates are open.
 function approve(pid, days) {
   const p = registry.get(pid); if (!p) return null;
      const billingGate = guard.gate('billing');

   const status = billingGate.allowed ? 'active' : 'active_dry_run';
   const trialDays = parseInt(days, 10) || DEFAULT_TRIAL_DAYS;
   const expiresAt = new Date(Date.now() + trialDays * 86400000).toISOString();
 return registry.update(pid, { trialStatus: status, onboardingStatus: 'pilot_active', trialExpiresAt: expiresAt,
trialDays: trialDays });
}


function markExpiringSoon(pid) { const p = registry.get(pid); if (!p) return null; return registry.update(pid, {
trialStatus: 'expiring_soon' }); }
function expire(pid) { const p = registry.get(pid); if (!p) return null; return registry.update(pid, { trialStatus:
'expired' }); }
function cancel(pid) { const p = registry.get(pid); if (!p) return null; return registry.update(pid, { trialStatus:
'cancelled', onboardingStatus: 'cancelled' }); }

// Conversion is recorded locally; real billing activation is NOT done here.
function convert(pid) {
 const p = registry.get(pid); if (!p) return null;
   const billingGate = guard.gate('billing');
   return registry.update(pid, { trialStatus: 'converted', onboardingStatus: 'converted_paid', billingActivated:
billingGate.allowed, billingNote: billingGate.allowed ? 'billing gate open' : 'recorded only; billing not activated (dry-run)' });
}

// Days remaining helper for risk scoring.
function daysRemaining(pilot) {
   if (!pilot || !pilot.trialExpiresAt) return null;
   const ms = new Date(pilot.trialExpiresAt).getTime() - Date.now();
   return Math.ceil(ms / 86400000);
}


module.exports = { TRIAL_STATUSES, request, approve, markExpiringSoon, expire, cancel, convert, daysRemaining,
DEFAULT_TRIAL_DAYS };
