/* public/js/template-marketplace.js — Admin Template Marketplace controller. Dry-run, preview-only. */
(function(){
  const API='/api/template-marketplace';
  const $=(id)=>document.getElementById(id);
  const get=(p)=>fetch(API+p).then(r=>r.json());
  const post=(p,b)=>fetch(API+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(r=>r.json());
  let all=[]; let activeCat='';

  const SAFETY=[['Dry-run','enabled'],['Live install','disabled'],['Live sending','disabled'],
    ['External APIs','disabled'],['Secrets','redacted'],['PII','masked']];

  async function init(){
    const s=await get('/status');
    const pill=$('tm-pill'); pill.textContent=s.enabled?'MARKETPLACE ON · dry-run':'off'; if(s.enabled)pill.classList.add('on');
    if(s.liveInstallEnabled===false) $('tm-ai-badge').textContent='no external AI';
    renderOverview(await get('/dashboard'));
    renderSafety();
    const t=await get('/templates'); all=t.templates||[];
    renderFilters(); renderCatalog(all); fillInstallSelect(all);
    renderRecipes(await get('/recipes'));
  }
  function renderOverview(d){ const s=d.dashboard||{};
    const cards=[['Total Templates',s.total||0],['Active',s.active||0],['Recipes',d.dashboard&&d.dashboard.recipes||0],
      ['Industry Blueprints',s.industryBlueprints||0],['Public-safe',s.publicSafe||0],['Reseller-safe',s.resellerSafe||0]];
    $('tm-overview').innerHTML=cards.map(([l,v])=>`<div class="tm-card"><div class="tm-kpi">${v}</div><div class="tm-kpi-lab">${l}</div></div>`).join('');
  }
  function renderSafety(){ $('tm-safety').innerHTML=SAFETY.map(([l,v])=>`<div class="tm-safe-item"><span class="dot"></span><span><strong>${l}</strong> — ${v}</span></div>`).join(''); }
  function renderFilters(){ const cats=[...new Set(all.map(t=>t.category))];
    $('tm-filters').innerHTML=`<span class="tm-chip${!activeCat?' active':''}" onclick="TM.cat('')">All</span>`+
      cats.map(c=>`<span class="tm-chip${activeCat===c?' active':''}" onclick="TM.cat('${c}')">${c}</span>`).join(''); }
  function renderCatalog(list){ $('tm-catalog').innerHTML=list.map(t=>`<div class="tm-card">
      <h3>${t.title}</h3><p>${t.description||''}</p>
      <div class="tm-meta">${(t.tags||[]).slice(0,3).map(x=>`<span class="tm-tag">${x}</span>`).join('')}
        <span class="tm-tag">${t.visibility}</span></div>
      <button class="tm-btn tm-btn-ghost" onclick="TM.detail('${t.id}')">View detail</button></div>`).join('')||'<p style="color:#8b949e">No templates.</p>'; }
  function fillInstallSelect(list){ $('tm-install-template').innerHTML=list.map(t=>`<option value="${t.id}">${t.title}</option>`).join(''); }
  function renderRecipes(r){ $('tm-recipes').innerHTML=(r.recipes||[]).map(x=>`<div class="tm-card">
      <h3>${x.title}</h3><p>Trigger: <code>${x.trigger}</code></p>
      <div class="tm-meta"><span class="tm-tag">risk: ${x.riskLevel}</span><span class="tm-tag">${x.approvalRequired?'approval':'auto'}</span></div>
      <button class="tm-btn tm-btn-ghost" onclick="TM.recipePreview('${x.id}')">Preview run</button></div>`).join(''); }

  const TM={
    cat(c){ activeCat=c; renderFilters(); TM.filter(); },
    filter(){ const q=($('tm-search').value||'').toLowerCase();
      let list=all.filter(t=>(!activeCat||t.category===activeCat)&&(!q||t.title.toLowerCase().includes(q)||(t.description||'').toLowerCase().includes(q)));
      renderCatalog(list); },
    async detail(id){ const r=await get('/templates/'+id); const t=r.template; if(!t)return;
      $('tm-detail-section').hidden=false; $('tm-detail-title').textContent=t.title;
      $('tm-detail').innerHTML=`<p>${t.description||''}</p>
        <p><strong>Industry:</strong> ${t.industry} · <strong>Setup:</strong> ${t.estimatedSetupTime} · <strong>Plan:</strong> ${t.recommendedPlan}</p>
        <p><strong>Modules:</strong> ${(t.modulesUsed||[]).join(', ')}</p>
        <p><strong>Recipes:</strong> ${(t.includedRecipes||[]).join(', ')||'—'}</p>
        <p><strong>Setup checklist:</strong> ${(t.includedOwnerTasks||[]).join(', ')||'—'}</p>
        <button class="tm-btn" onclick="TM.installPreviewId('${t.id}')">Preview Install</button>`;
      $('tm-detail-section').scrollIntoView({behavior:'smooth'}); },
    closeDetail(){ $('tm-detail-section').hidden=true; },
    async installPreview(){ TM.installPreviewId($('tm-install-template').value); },
    async installPreviewId(id){ const r=await post(`/templates/${id}/install-preview`,{}); $('tm-install-out').textContent=JSON.stringify(r,null,2); },
    async recipePreview(id){ const r=await post(`/recipes/${id}/preview`,{}); $('tm-install-out').textContent=JSON.stringify(r,null,2); $('tm-install-out').scrollIntoView({behavior:'smooth'}); },
    async draftTemplate(){ const r=await post('/drafts/template',{industry:$('tm-draft-industry').value||'General Business'}); $('tm-draft-out').textContent=JSON.stringify(r.draft,null,2); },
    async draftRecipe(){ const r=await post('/drafts/recipe',{goal:$('tm-draft-industry').value||'follow up new leads'}); $('tm-draft-out').textContent=JSON.stringify(r.draft,null,2); },
    async exportPack(){ const r=await post('/export',{}); $('tm-export-out').textContent=(r.pack?r.pack.count+' template(s), redacted\n\n':'')+(r.markdown||JSON.stringify(r,null,2)).slice(0,2000); },
  };
  window.TM=TM;
  document.addEventListener('DOMContentLoaded',init);
})();
