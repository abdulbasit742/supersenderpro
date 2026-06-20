/* public/js/templates.js — Public template gallery (public_safe + demo_only only; no admin/internal details). */
(function(){
  const grid=document.getElementById('tg-grid');
  fetch('/api/template-marketplace/public-gallery').then(r=>r.json()).then(d=>{
    const list=d.templates||[];
    if(!list.length){ grid.innerHTML='<p class="tg-mut">No public templates available yet.</p>'; return; }
    grid.innerHTML=list.map(t=>`<div class="tg-card">
      <div class="tg-ind">${t.industry}</div>
      <h3>${t.title}</h3><p>${t.summary||''}</p>
      <div class="tg-mods">${(t.modulesUsed||[]).slice(0,4).map(m=>`<span class="tg-mod">${m}</span>`).join('')}</div>
      <div class="tg-time">⏱ Setup ~${t.estimatedSetupTime||'15m'} · ${t.difficulty||'beginner'}</div>
      <div class="tg-cta">
        <a class="tg-btn ghost" href="/start.html">Request Demo</a>
        <a class="tg-btn ghost" href="/demo-sandbox.html">Try Demo</a>
        <a class="tg-btn" href="/start.html?template=${t.slug}">Start Setup Preview</a></div></div>`).join('');
  }).catch(()=>{ grid.innerHTML='<p class="tg-mut">Could not load templates.</p>'; });
})();
