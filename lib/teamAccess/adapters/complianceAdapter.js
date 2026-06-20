// adapters/complianceAdapter.js — Compliance Center integration (redacted summary only). No mutation, no external calls.
'use strict';
let available=false; for(const c of ['../../../lib/complianceCenter','../../../routes/complianceCenterRoutes']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function summary(){ return { available, redacted:true, mutates:false, externalCalls:false,
  note: available?'Compliance Center detected — redacted summary only':'Compliance Center not detected — unavailable safely' }; }
module.exports={ available, summary };
