/* public/js/feature-flags.js — Feature Flags admin controller. Dry-run, preview-only, no live writes. */
(function(){
  const API='/api/feature-flags';
  const $=(id)=>document.getElementById(id);
  const get=(p)=>fetch(API+p).then(r=>r.json());
  const post=(p,b)=>fetch(API+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(r=>r.json());
  let all=[];

  const SAFETY=[['Dry-run','enabled'],['Live write','disabled'],['Kill-switch write','disabled'],
    ['Approval','required'],['Audit integration','on'],['Security/Compliance','integrated']];

  async function init(){
    const s=await get('/status');
    const pill=$('ff-pill'); pill.textContent=s.enabled?'FLAGS ON · dry-run':'off'; if(s.enabled)pill.classList.add('on');
    renderOverview(await get('/dashboard'));
    renderSafety();
    const f=await get('/flags'); all=f.flags||[];
    renderRegistry(all); fillSelects(all);
  }
  function renderOverview(d){ const s=d.dashboard||{};
    const cards=[['Total',s.totalFlags||0],['Enabled-preview',s.enabledPreview||0],['Disabled',s.disabled||0],
      ['Beta',s.beta||0],['Killed',s.killed||0],['High-risk',s.highRisk||0],['Pending approval',s.pendingApproval||0]];
    $('ff-overview').innerHTML=cards.map(([l,v])=>`<div class="ff-card"><div class="ff-kpi">${v}</div><div class="ff-kpi-lab">${l}</div></div>`).join('');
  }
  function renderSafety(){ $('ff-safety').innerHTML=SAFETY.map(([l,v])=>`<div class="ff-safe-item"><span class="dot"></span><span><strong>${l}</strong> — ${v}</span></div>`).join(''); }
  function renderRegistry(list){
    const tb=$('ff-registry').querySelector('tbody');
    tb.innerHTML=list.map(f=>`<tr>
      <td>${f.moduleId}</td>
      <td><span class="ff-link" onclick="FF.detail('${f.key}')">${f.name}</span></td>
      <td><span class="ff-status s-${f.status}">${f.status}</span></td>
      <td>${f.rolloutMode}</td>
      <td class="risk-${f.riskLevel}">${f.riskLevel}</td>
      <td>${(f.allowedPlans||[]).join(',')}</td>
      <td>${f.killSwitchEnabled?'🛑':'—'}</td>
      <td><button class="ff-btn ff-btn-ghost" onclick="FF.evaluateRow('${f.key}')">Eval</button></td></tr>`).join('');
  }
  function fillSelects(list){ const opts=list.map(f=>`<option value="${f.key}">${f.name}</option>`).join('');
    ['ff-rollout-key','ff-kill-key','ff-acc-key'].forEach(id=>{ $(id).innerHTML=opts; }); }

  const FF={
    filter(){ const q=($('ff-search').value||'').toLowerCase();
      renderRegistry(all.filter(f=>!q||f.name.toLowerCase().includes(q)||f.key.includes(q)||f.moduleId.toLowerCase().includes(q))); },
    async detail(key){ const r=await get('/flags/'+key); const f=r.flag; if(!f)return;
      $('ff-detail-section').hidden=false; $('ff-detail-title').textContent=f.name;
      $('ff-detail').innerHTML=`<p>${f.description||''}</p>
        <p><strong>Module:</strong> ${f.moduleId} · <strong>Risk:</strong> <span class="risk-${f.riskLevel}">${f.riskLevel}</span> · <strong>Status:</strong> ${f.status}</p>
        <p><strong>Rollout mode:</strong> ${f.rolloutMode} · <strong>Percent:</strong> ${f.rolloutPercent||0}%</p>
        <p><strong>Allowed plans:</strong> ${(f.allowedPlans||[]).join(', ')} · <strong>Approval:</strong> ${f.requiresApproval?'required':'no'}</p>
        <p><strong>Safety:</strong> ${f.safetyNotes||'—'}</p>`;
      $('ff-detail-section').scrollIntoView({behavior:'smooth'}); },
    closeDetail(){ $('ff-detail-section').hidden=true; },
    async evaluateRow(key){ const r=await post(`/flags/${key}/evaluate`,{userRole:'admin',planId:'business',betaGroup:true});
      $('ff-acc-out').textContent=JSON.stringify(r.decision,null,2); $('ff-acc-out').scrollIntoView({behavior:'smooth'}); },
    async rolloutPreview(){ const body={ featureKey:$('ff-rollout-key').value, targetMode:$('ff-rollout-mode').value };
      const pct=parseInt($('ff-rollout-percent').value,10); if(!isNaN(pct)) body.targetPercent=pct;
      const r=await post('/rollout/preview',body); $('ff-rollout-out').textContent=JSON.stringify(r,null,2); },
    async killPreview(){ const r=await post(`/kill-switch/${$('ff-kill-key').value}/preview`,{reason:$('ff-kill-reason').value});
      $('ff-kill-out').textContent=JSON.stringify(r,null,2); },
    async accessCheck(){ const body={ featureKey:$('ff-acc-key').value, tenantId:$('ff-acc-tenant').value||null,
      resellerId:$('ff-acc-reseller').value||null, planId:$('ff-acc-plan').value, userRole:$('ff-acc-role').value, betaGroup:$('ff-acc-beta').checked };
      const r=await post('/access/check',body); $('ff-acc-out').textContent=JSON.stringify(r.decision,null,2); },
  };
  window.FF=FF;
  document.addEventListener('DOMContentLoaded',init);
})();
