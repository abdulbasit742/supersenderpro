'use strict';
const API='/api/shared-inbox'; const $=(s)=>document.querySelector(s); const j=(u,o)=>fetch(u,o).then(r=>r.json());
async function load(){ const el=$('#si-status'); if(!el)return; try{ const s=await j(API+'/status'); el.textContent=s.dryRun?'Shared Inbox dry-run':'Shared Inbox'; }catch(e){ el.textContent='Shared Inbox unavailable'; } }
load();
