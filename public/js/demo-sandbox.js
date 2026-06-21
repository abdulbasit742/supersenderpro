'use strict';
const API='/api/demo-sandbox'; const $=(s)=>document.querySelector(s); const j=(u,o)=>fetch(u,o).then(r=>r.json());
async function load(){ const el=$('#ds-status'); if(!el)return; try{ const s=await j(API+'/status'); el.textContent=s.ok?'Demo sandbox ready':'Demo sandbox unavailable'; }catch(e){ el.textContent='Demo sandbox unavailable'; } }
load();
