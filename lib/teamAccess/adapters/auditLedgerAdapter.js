// adapters/auditLedgerAdapter.js — Audit Ledger integration (writes redacted audit PREVIEW only).
'use strict';
let available=false; for(const c of ['../../../lib/auditLedger','../../../routes/auditRoutes','../../../lib/audit']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function auditPreview(evt={}){
  return { available, written:false, redacted:true, kind:evt.kind||'team_access_event', permission:evt.permission||null, actionType:evt.actionType||null,
    note: available?'Audit event preview (not written live)':'Audit Ledger not detected — preview only', at:new Date().toISOString() };
}
module.exports={ available, auditPreview };
