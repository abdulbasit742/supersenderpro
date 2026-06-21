'use strict';
const API='/api/reseller-portal'; const $=(s)=>document.querySelector(s); const j=(u,o)=>fetch(u,o).then(r=>r.json());
async function loadStatus(){ const s=await j(API+'/status'); const el=$('#rp-mode'); if(el) el.textContent=s.dryRun?'DRY-RUN - preview only':'LIVE'; }
loadStatus();
