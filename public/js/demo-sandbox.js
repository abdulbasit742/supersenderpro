/* public/js/demo-sandbox.js — Demo Sandbox dashboard controller. Read-only previews + dry-run. */
(function(){
  const API='/api/demo-sandbox';
  const $=(id)=>document.getElementById(id);
  const get=(p)=>fetch(API+p).then(r=>r.json());
  const post=(p,b)=>fetch(API+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(r=>r.json());

  const LINKS=[['Owner Command','/owner-briefing'],['Customer 360','/customer-360'],['Voice AI','/voice-ai'],
    ['Channel Automation','/channel-automation'],['Growth Campaigns','/owner-briefing'],['KPI Command','/owner-briefing'],
    ['SaaS Billing','/re-dashboard.html'],['Public Funnel','/']];
  const SAFETY=[['Real customer data','disabled'],['External API calls','disabled'],['Live WhatsApp sending','disabled'],
    ['Social/channel posting','disabled'],['Payment capture','disabled'],['Real tenant writes','disabled']];

  async function init(){
    const s=await get('/status');
    const pill=$('ds-pill');
    pill.textContent = s.enabled ? 'DEMO MODE ON · dry-run' : 'demo off';
    if (s.enabled) pill.classList.add('on');
    renderOverview(s);
    renderSafety();
    renderLinks();
    loadScenarios();
    loadTours();
    setupDataTabs();
  }
  function renderOverview(s){
    const cards=[
      ['Demo Mode', s.enabled?'ON':'off'], ['Active Scenario', s.scenario||'—'],
      ['Demo Tenant', s.demoTenantId||'—'], ['Dry-run', s.dryRun?'YES':'no'],
      ['Live Actions', s.blockLiveActions?'BLOCKED':'allowed'],
    ];
    $('ds-overview').innerHTML=cards.map(([l,v])=>`<div class="ds-card"><div class="ds-kpi">${v}</div><div class="ds-kpi-lab">${l}</div></div>`).join('');
  }
  function renderSafety(){
    $('ds-safety').innerHTML=SAFETY.map(([l,v])=>`<div class="ds-safe-item"><span class="dot"></span><span><strong>${l}</strong> — ${v}</span></div>`).join('');
  }
  function renderLinks(){
    $('ds-links').innerHTML=LINKS.map(([l,h])=>`<a href="${h}">${l} →</a>`).join('');
  }
  async function loadScenarios(){
    const r=await get('/scenarios');
    $('ds-scenarios').innerHTML=(r.scenarios||[]).map(sc=>`<div class="ds-card">
      <h3>${sc.title}</h3><p>${sc.description}</p>
      <button class="ds-btn ds-btn-sm" onclick="Demo.startScenario('${sc.id}')">Start scenario</button></div>`).join('');
  }
  async function loadTours(){
    const r=await get('/tours');
    $('ds-tours').innerHTML=(r.tours||[]).map(t=>`<div class="ds-card">
      <h3>${t.title}</h3><p>${t.steps} guided step(s)</p>
      <button class="ds-btn ds-btn-sm" onclick="Demo.startTour('${t.id}')">Start tour</button></div>`).join('');
  }
  const MODULES=['business','customers','orders','payments','whatsapp','ecommerce','voiceAI','marketplace','kpi','saasBilling'];
  function setupDataTabs(){
    $('ds-data-tabs').innerHTML=MODULES.map((m,i)=>`<button class="ds-tab${i===0?' active':''}" data-m="${m}" onclick="Demo.previewModule('${m}',this)">${m}</button>`).join('');
  }

  const Demo={
    async startScenario(id){
      const r=await post(`/scenarios/${id}/start`);
      if(r.ok){ const s=await get('/status'); renderOverview(s);
        $('ds-data-out').textContent=JSON.stringify(r.data,null,2);
        if(r.recommendedPages&&r.recommendedPages.length){
          $('ds-tour-progress').hidden=false; $('ds-tour-next').textContent='Recommended: '+r.recommendedPages.join('  ·  ');
          $('ds-progress-bar').style.width='100%'; }
        if(r.tourId && window.DemoTour) DemoTour.start(r.tourId);
      } else alert('Scenario failed: '+(r.error||'unknown'));
    },
    startTour(id){ if(window.DemoTour) DemoTour.start(id); },
    async reset(){ if(!confirm('Reset demo data to fresh fake data?')) return;
      const r=await post('/reset'); alert(r.ok?'Demo reset ✔ (fake data only)':'Reset failed');
      const s=await get('/status'); renderOverview(s); },
    async previewData(){ const r=await get('/data'); $('ds-data-out').textContent=JSON.stringify(r.data,null,2); },
    async previewModule(m,btn){ document.querySelectorAll('.ds-tab').forEach(t=>t.classList.remove('active')); if(btn)btn.classList.add('active');
      const r=await get('/data/'+m); $('ds-data-out').textContent=JSON.stringify(r.data!==undefined?r.data:r,null,2); },
  };
  window.Demo=Demo;
  document.addEventListener('DOMContentLoaded',init);
})();
