// lib/featureFlags/adapters/incidentCommandAdapter.js — Incident Command integration (preview-only).
'use strict';
let available=false; try{ require.resolve('../../../lib/incidentCommand'); available=true; }catch(_e){ available=false; }
function incidentPreview(evt={}){
  return { available, severity:'warning', featureKey:evt.featureKey, reason:evt.reason, created:false,
    note: available?'Incident warning preview (not created live)':'Incident Command not detected — preview only' };
}
module.exports={ incidentPreview, available };
