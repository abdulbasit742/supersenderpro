// lib/featureFlags/accessDecision.js — Builds the standard access decision object.
'use strict';
function decide({ featureKey, allowed, reason, status, requiresApproval, blockers=[], warnings=[], extra={} }){
  return { featureKey, allowed:!!allowed, reason, status, dryRun:true, requiresApproval:!!requiresApproval,
    blockers, warnings, ...extra, decidedAt:new Date().toISOString() };
}
module.exports={ decide };
