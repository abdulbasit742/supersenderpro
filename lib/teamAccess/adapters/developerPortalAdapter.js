// adapters/developerPortalAdapter.js — Developer Portal integration (redacted summary only). No mutation, no external calls.
'use strict';
let available=false; for(const c of ['../../../lib/developerPortal','../../../routes/developerPortalRoutes']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function summary(){ return { available, redacted:true, mutates:false, externalCalls:false,
  note: available?'Developer Portal detected — redacted summary only':'Developer Portal not detected — unavailable safely' }; }
module.exports={ available, summary };
