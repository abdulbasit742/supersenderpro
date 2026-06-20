// adapters/approvalInboxAdapter.js — Approval Inbox integration (creates approval-item PREVIEW only).
'use strict';
let available=false; for(const c of ['../../../lib/approvalInbox','../../../routes/approvalInboxRoutes','../../../lib/approvals']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function requestPreview(evt={}){
  return { available, created:false, kind:evt.kind||'team_access', permission:evt.permission||null, actionType:evt.actionType||null,
    dryRun:true, note: available?'Approval item preview (not created live)':'Approval Inbox not detected — preview only', at:new Date().toISOString() };
}
module.exports={ available, requestPreview };
