// lib/teamAccess/accessHistory.js — Redacted, local-only access-decision history (gitignored store).
// Stores no secrets/full PII/tokens. Used for previews/audit-trail only; never a live audit write.
'use strict';
const { paths }=require('./config');
const store=require('./store');
const privacy=require('./privacyGuard');
function record(decision={}, meta={}){
  const entry=privacy.redact({
    kind:meta.kind||'access_decision', permission:decision.permission||null,
    roleId:decision.roleId||null, workspaceId:privacy.maskId(decision.workspaceId)||null,
    allowed:decision.allowed===true, approvalRequired:decision.approvalRequired===true,
    blockers:decision.blockers||[], warnings:decision.warnings||[],
  });
  store.appendHistory(paths.history, entry, 500);
  return { ok:true, recorded:true, redacted:true, at:new Date().toISOString() };
}
function list(limit=100){ return store.readJSON(paths.history, []).slice(0, limit); }
module.exports={ record, list };
