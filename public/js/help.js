'use strict';
const API='/api/support-helpdesk'; const $=(s)=>document.querySelector(s); const j=(u,o)=>fetch(u,o).then(r=>r.json());
async function loadFaq(){ const el=$('#faq'); if(!el)return; const r=await j(API+'/kb'); const a=(r.articles||[]); el.innerHTML=a.map(x=>`<details><summary>${x.title}</summary><p>${x.summary}</p></details>`).join('') || '<p>No articles yet.</p>'; }
loadFaq();
