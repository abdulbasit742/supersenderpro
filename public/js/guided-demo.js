'use strict';
const API='/api/guided-demo'; const $=(s)=>document.querySelector(s); const j=(u,o)=>fetch(u,o).then(r=>r.json());
async function loadStatus(){ const s=await j(API+'/status'); const el=$('#gd-mode'); if(el) el.textContent=s.safety&&s.safety.dryRun?'DRY-RUN demo':'LIVE demo'; }
loadStatus();
