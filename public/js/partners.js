'use strict';
const API='/api/reseller-portal'; const $=(s)=>document.querySelector(s); const j=(u,o)=>fetch(u,o).then(r=>r.json());
const f=$('#partner-form'); if(f) f.addEventListener('submit',async(e)=>{ e.preventDefault(); const r=await j(API+'/public/partner-inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true})}); const out=$('#partner-result'); if(out) out.textContent=r.ok?'Thanks! Your inquiry was logged.':'Something went wrong.'; });
