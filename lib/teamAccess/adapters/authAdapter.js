// adapters/authAdapter.js — Existing auth/session integration (DETECT ONLY). Never creates/modifies auth users.
'use strict';
let available=false; for(const c of ['../../../backend/src/middleware/auth','../../../backend/src/routes/auth','../../../lib/auth']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
// This adapter NEVER writes to the auth system. It only reports detection + enforces no-auth-write.
function status(){ return { available, authWriteEnabled:false, createsUsers:false, modifiesAuth:false,
  note: available?'Auth system detected — Team Access will NOT modify it (no-auth-write)':'Auth system not detected — preview only' }; }
module.exports={ available, status };
