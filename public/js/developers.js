/* developers.js — public-safe: lists integration apps + public event names only */
(async()=>{
  try{
    const a=await (await fetch('/api/developer-portal/integration-apps')).json();
    document.getElementById('apps').innerHTML=(a.apps||[]).map(x=>`<div class="box"><div class="t">${x.name}</div><div class="m">${x.description}</div></div>`).join('');
  }catch(e){}
  try{
    const e=await (await fetch('/api/developer-portal/events')).json();
    // Show only public-safe (non-high PII) event names
    const safe=(e.events||[]).filter(x=>x.piiRisk!=='high');
    document.getElementById('events').innerHTML=safe.map(x=>`<div class="box"><div class="t"><code>${x.eventType}</code></div><div class="m">${x.module}</div></div>`).join('');
  }catch(e){}
})();
