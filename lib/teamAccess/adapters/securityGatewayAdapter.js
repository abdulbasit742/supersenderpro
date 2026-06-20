// adapters/securityGatewayAdapter.js — Security Gateway integration (preview risk flagging). No enforcement.
'use strict';
let available=false; for(const c of ['../../../lib/securityGateway','../../../lib/security','../../../routes/securityRoutes']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
function evaluatePreview({ permission }={}){
  return { available, flagged:false, permission:permission||null, dryRun:true,
    note: available?'Security Gateway detected — preview only, no enforcement':'Security Gateway not detected — preview only' };
}
module.exports={ available, evaluatePreview };
