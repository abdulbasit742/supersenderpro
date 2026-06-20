// adapters/supportHelpdeskAdapter.js — Support Helpdesk integration (redacted summary only). No mutation, no external calls.
'use strict';
let available=false; for(const c of ['../../../lib/supportHelpdesk','../../../routes/supportRoutes']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function summary(){ return { available, redacted:true, mutates:false, externalCalls:false,
  note: available?'Support Helpdesk detected — redacted summary only':'Support Helpdesk not detected — unavailable safely' }; }
module.exports={ available, summary };
