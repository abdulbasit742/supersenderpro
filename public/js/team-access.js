// public/js/team-access.js — Team Access dashboard client. Read/preview only; never sends live invites.
const API='/api/team-access';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
async function api(path, method='GET', body){
  const opt={ method, headers:{ 'Content-Type':'application/json' } };
  if(body) opt.body=JSON.stringify(body);
  const r=await fetch(API+path, opt); return r.json();
}
function pill(text, cls=''){ return `<span class="pill ${cls}">${text}</span>`; }

$$('.ta-tab').forEach(t=>t.addEventListener('click',()=>{
  $$('.ta-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
  $$('.ta-panel').forEach(p=>p.classList.remove('active')); $('#'+t.dataset.tab).classList.add('active');
}));

async function loadOverview(){
  const { dashboard }=await api('/dashboard'); if(!dashboard) return;
  const o=dashboard.overview||{};
  const cards=[
    ['Workspaces', o.workspaces], ['Active preview seats', o.activePreviewSeats],
    ['Pending invite drafts', o.pendingInviteDrafts], ['Seat limit warnings', o.seatLimitWarnings],
    ['High-risk permissions', o.highRiskPermissions], ['Tenant isolation', o.tenantIsolationEnabled?'ON':'OFF'],
  ];
  $('#ta-overview-cards').innerHTML=cards.map(([k,v])=>`<div class="ta-card"><div class="k">${k}</div><div class="v">${v??'-'}</div></div>`).join('');
  // workspaces table
  const wb=$('#ta-workspaces tbody'); wb.innerHTML=(dashboard.workspaces||[]).map(w=>{
    const s=w.seatUsage||{}; return `<tr><td>${w.businessName}</td><td>${w.workspaceType}</td><td>${w.planId}</td>
      <td>${s.activeSeats??0}/${s.seatLimit??'∞'}</td><td>${w.status}</td><td>${w.resellerId||'-'}</td></tr>`; }).join('')||'<tr><td colspan=6>No workspaces yet</td></tr>';
  // safety badges + cards
  const safe=dashboard.safety||{};
  $('#ta-safety-badges').innerHTML=[
    ['dry-run', safe.dryRun], ['auth-write off', safe.authWriteDisabled], ['live-invites off', safe.liveInvitesDisabled],
    ['PII masked', safe.piiMasked], ['tenant isolation', safe.tenantIsolationEnabled],
  ].map(([k,v])=>`<span class="ta-badge ${v?'ok':'bad'}">${v?'✓':'✗'} ${k}</span>`).join('');
  $('#ta-safety-cards').innerHTML=Object.entries(safe).map(([k,v])=>`<div class="ta-card"><div class="k">${k}</div><div class="v">${v===true?'ON':v===false?'OFF':v}</div></div>`).join('');
  renderMatrix(dashboard.roles||[]);
}
function renderMatrix(rows){
  if(!rows.length){ return; }
  let h='<table><thead><tr><th>Role</th><th>Read-only</th><th>#Perms</th><th>Risky permissions</th></tr></thead><tbody>';
  h+=rows.map(r=>`<tr><td>${r.label||r.roleId}</td><td>${r.readOnly?pill('read-only','ok'):'-'}</td><td>${r.permissionCount}</td>
    <td>${(r.riskyPermissions||[]).map(p=>pill(p,'risky')).join(' ')||'-'}</td></tr>`).join('');
  h+='</tbody></table>'; $('#ta-matrix').innerHTML=h;
}
async function loadRolesIntoSelect(){
  const { roles }=await api('/roles'); const sel=$('#inv-role');
  if(roles) sel.innerHTML=roles.map(r=>`<option value="${r.id}">${r.label||r.id}</option>`).join('');
}
$('#ta-load-members').addEventListener('click', async ()=>{
  const ws=$('#ta-member-ws').value.trim(); if(!ws) return;
  const { members }=await api(`/workspaces/${ws}/members`);
  $('#ta-members tbody').innerHTML=(members||[]).map(m=>`<tr><td>${m.displayNameSafe}</td><td>${m.roleId}</td><td>${m.seatType}</td>
    <td>${m.status}</td><td>${m.lastActiveAt||'-'}</td>
    <td><button class="ta-btn secondary" data-act="suspend" data-id="${m.id}">Suspend</button>
    <button class="ta-btn secondary" data-act="remove" data-id="${m.id}">Remove</button></td></tr>`).join('')||'<tr><td colspan=6>No members</td></tr>';
  $$('#ta-members [data-act]').forEach(b=>b.addEventListener('click', async ()=>{
    const r=await api(`/members/${b.dataset.id}/${b.dataset.act}-preview`,'POST',{});
    alert(`${b.dataset.act} preview: ${r.note||JSON.stringify(r)}`);
  }));
});
$('#ck-run').addEventListener('click', async ()=>{
  const body={ roleId:$('#ck-role').value.trim(), permission:$('#ck-perm').value.trim(),
    workspaceId:$('#ck-ws').value.trim()||null, tenantId:$('#ck-tenant').value.trim()||null,
    resourceTenantId:$('#ck-rtenant').value.trim()||null };
  const { decision }=await api('/check','POST',body);
  $('#ck-result').textContent=JSON.stringify(decision,null,2);
});
$('#seat-run').addEventListener('click', async ()=>{
  const ws=$('#seat-ws').value.trim(); if(!ws) return;
  const { seats }=await api(`/workspaces/${ws}/seat-usage-preview`,'POST',{});
  $('#seat-result').textContent=JSON.stringify(seats,null,2);
});
$('#inv-run').addEventListener('click', async ()=>{
  const ws=$('#inv-ws').value.trim(); if(!ws) return;
  const r=await api(`/workspaces/${ws}/invite-draft`,'POST',{ roleId:$('#inv-role').value, email:$('#inv-email').value.trim() });
  $('#inv-result').textContent=JSON.stringify(r,null,2); loadInvites();
});
async function loadInvites(){
  const { invites }=await api('/invites');
  $('#ta-invites tbody').innerHTML=(invites||[]).map(i=>`<tr><td>${i.id}</td><td>${i.workspaceId}</td><td>${i.roleId}</td>
    <td>${i.emailMasked||'-'}</td><td>${i.status}</td><td>${(i.expiresAtPreview||'').slice(0,10)}</td></tr>`).join('')||'<tr><td colspan=6>No invite drafts</td></tr>';
}

async function loadMonitor(){
  const sw=await api('/seat-warnings');
  const cards=[['Workspaces', sw.summary?sw.summary.total:'-'],['OK', sw.summary?sw.summary.ok:'-'],
    ['Near limit', sw.summary?sw.summary.near:'-'],['Exceeded', sw.summary?sw.summary.exceeded:'-']];
  $('#ta-monitor-cards').innerHTML=cards.map(([k,v])=>`<div class="ta-card"><div class="k">${k}</div><div class="v">${v??'-'}</div></div>`).join('');
  $('#ta-seat-warnings tbody').innerHTML=(sw.warnings||[]).map(w=>`<tr><td>${w.businessName}</td><td>${w.planId}</td>
    <td>${w.activeSeats}/${w.seatLimit??'∞'}</td><td>${pill(w.level, w.level==='exceeded'?'bad':'warn')}</td>
    <td>${w.upgradeRecommendation||'-'}</td></tr>`).join('')||'<tr><td colspan=5>No seat warnings</td></tr>';
  const h=await api('/history?limit=50');
  $('#ta-history tbody').innerHTML=(h.history||[]).map(e=>`<tr><td>${(e.at||'').slice(0,19).replace('T',' ')}</td>
    <td>${e.roleId||'-'}</td><td>${e.permission||'-'}</td><td>${e.allowed?pill('yes','ok'):pill('no','bad')}</td>
    <td>${e.approvalRequired?'required':'-'}</td></tr>`).join('')||'<tr><td colspan=5>No history yet</td></tr>';
}
(async function init(){ try{ await loadOverview(); await loadRolesIntoSelect(); await loadInvites(); await loadMonitor(); }catch(e){ console.error('[TeamAccess]',e); } })();
