// adapters/customer360Adapter.js — Customer 360 integration (redacted summary only). No mutation, no external calls.
'use strict';
let available=false; for(const c of ['../../../lib/customer360','../../../routes/customer360Routes']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function summary(){ return { available, redacted:true, mutates:false, externalCalls:false,
  note: available?'Customer 360 detected — redacted summary only':'Customer 360 not detected — unavailable safely' }; }
module.exports={ available, summary };
