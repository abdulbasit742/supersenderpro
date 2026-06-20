// lib/featureFlags/adapters/auditLedgerAdapter.js — Audit Ledger integration (preview-only, redacted).
'use strict';
let available=false; try{ require.resolve('../../../lib/auditLedger'); available=true; }catch(_e){ available=false; }
function auditPreview(evt={}){
  return { available, event:evt.kind||'flag_change', featureKey:evt.featureKey, reason:evt.reason,
    redacted:true, written:false, note: available?'Audit event preview (not written live)':'Audit Ledger not detected — preview only', at:new Date().toISOString() };
}
module.exports={ auditPreview, available };
