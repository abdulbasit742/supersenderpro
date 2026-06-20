// adapters/ownerCommandAdapter.js — Owner Command integration (redacted summary only). No mutation, no external calls.
'use strict';
let available=false; for(const c of ['../../../lib/ownerBriefing','../../../routes/ownerBriefingRoutes']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function summary(){ return { available, redacted:true, mutates:false, externalCalls:false,
  note: available?'Owner Command detected — redacted summary only':'Owner Command not detected — unavailable safely' }; }
module.exports={ available, summary };
