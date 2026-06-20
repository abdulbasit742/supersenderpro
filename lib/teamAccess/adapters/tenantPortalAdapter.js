// adapters/tenantPortalAdapter.js — Tenant Portal integration (redacted summary only). No mutation, no external calls.
'use strict';
let available=false; for(const c of ['../../../lib/publicSaasFunnel/tenantProvisionPreview','../../../lib/saasBilling/tenantPlans','../../../routes/unifiedSetupRoutes']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function summary(){ return { available, redacted:true, mutates:false, externalCalls:false,
  note: available?'Tenant Portal detected — redacted summary only':'Tenant Portal not detected — unavailable safely' }; }
module.exports={ available, summary };
