'use strict';
const API='/api/support-helpdesk'; const $=(s)=>document.querySelector(s); const j=(u,o)=>fetch(u,o).then(r=>r.json());
async function loadStatus(){ const s=await j(API+'/status'); const el=$('#sh-mode'); if(el) el.textContent=s.dryRun?'DRY-RUN - replies disabled':'LIVE'; }
loadStatus();
