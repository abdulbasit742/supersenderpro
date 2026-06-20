// adapters/resellerPortalAdapter.js — Reseller Portal integration (redacted summary only). No mutation, no external calls.
'use strict';
let available=false; for(const c of ['../../../lib/resellerNetwork','../../../routes/resellerRoutes']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function summary(){ return { available, redacted:true, mutates:false, externalCalls:false,
  note: available?'Reseller Portal detected — redacted summary only':'Reseller Portal not detected — unavailable safely' }; }
module.exports={ available, summary };
