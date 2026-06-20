// lib/featureFlags/adapters/approvalInboxAdapter.js — Approval Inbox integration (preview-only).
'use strict';
let available=false; try{ require.resolve('../../../lib/approvalInbox'); available=true; }catch(_e){ available=false; }
// Creates a REDACTED approval-item preview. Never auto-approves; never writes to a live inbox by default.
function createApprovalPreview(item={}){
  return { available, kind:item.kind||'rollout', featureKey:item.featureKey, status:'pending_preview',
    requiresApproval:true, autoApproved:false, note: available?'Approval item preview (not submitted live)':'Approval Inbox not detected — preview only' };
}
module.exports={ createApprovalPreview, available };
