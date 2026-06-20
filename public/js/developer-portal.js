/* developer-portal.js — calls /api/developer-portal/* (all dry-run safe) */
const API='/api/developer-portal';
const $=s=>document.querySelector(s);
async function get(p){const r=await fetch(API+p);return r.json();}
async function post(p,b){const r=await fetch(API+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})});return r.json();}

document.querySelectorAll('.dp-tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.dp-tabs button').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');$('#'+b.dataset.tab).classList.add('active');
  load(b.dataset.tab);
});

async function loadStatus(){
  const s=await get('/status');
  const badge=$('#safetyBadge');
  if(s.success){badge.textContent=s.safety.dryRun?'🔒 Dry-run safe':'⚠ live mode';if(s.safety.dryRun)badge.classList.add('ok');}
}
async function load(tab){
  if(tab==='overview'){const d=await get('/dashboard');const o=d.overview||{};
    $('#overviewCards').innerHTML=Object.entries(o).map(([k,v])=>`<div class="card"><h3>${k}</h3><div class="v">${v}</div></div>`).join('');}
  if(tab==='apps'){const d=await get('/apps');
    $('#appList').innerHTML=(d.apps||[]).map(a=>`<div class="item"><div class="t">${a.name} <span class="pill">${a.appType}</span><span class="pill ${a.dryRun?'dry':''}">${a.status}</span></div><div class="m">id: <code>${a.id}</code> · key: ${a.apiKeyPreview||'—'} · url: ${a.webhookUrlMasked||'—'}</div><div style="margin-top:8px"><button onclick="issueKey('${a.id}')">Issue Key Preview</button> <button onclick="revoke('${a.id}')">Revoke</button></div></div>`).join('')||'<div class="item">No apps yet.</div>';}
  if(tab==='catalog'){const d=await get('/api-catalog');
    $('#catalogList').innerHTML=(d.endpoints||[]).map(e=>`<div class="item"><div class="t">${e.method} <code>${e.path}</code></div><div class="m">${e.module} — ${e.summary}</div><div style="margin-top:6px"><span class="pill dry">dry-run</span><span class="pill risk">PII: ${e.piiRisk}</span>${(e.scopes||[]).map(s=>`<span class="pill">${s}</span>`).join('')}</div></div>`).join('');}
  if(tab==='events'){const d=await get('/events');
    $('#eventList').innerHTML=(d.events||[]).map(e=>`<div class="item"><div class="t"><code>${e.eventType}</code></div><div class="m">${e.module} · default: ${e.deliveryDefault} <span class="pill risk">PII: ${e.piiRisk}</span></div><div class="m">example: <code>${JSON.stringify(e.redactedExample)}</code></div></div>`).join('');}
  if(tab==='webhooks'){const d=await get('/webhooks');
    $('#whList').innerHTML=(d.webhooks||[]).map(w=>`<div class="item"><div class="t">${w.urlMasked} <span class="pill ${w.dryRun?'dry':''}">${w.deliveryMode}</span></div><div class="m">events: ${(w.eventTypes||[]).join(', ')} · sig: ${w.signingSecretPreview}</div><div style="margin-top:8px"><button onclick="testWh('${w.id}')">Test (dry-run)</button> <button onclick="loadDeliv('${w.id}')">Deliveries</button></div></div>`).join('')||'<div class="item">No subscriptions.</div>';}
  if(tab==='deliveries'){loadDeliv(null);}
  if(tab==='docs'){$('#docsBox').innerHTML='<div class="item"><div class="t">Quickstart</div><div class="m">1. Create an app → 2. Issue a key preview → 3. Subscribe to events → 4. Run a dry-run test. All deliveries are simulated until an admin enables live mode.</div></div><div class="item"><div class="t">curl</div><div class="m"><code>curl '+location.origin+'/api/developer-portal/openapi.json</code></div></div><div class="item"><div class="t">Public docs</div><div class="m"><a href="/developers.html" style="color:#9ecbff">/developers.html</a></div></div>';}
  if(tab==='safety'){const s=await get('/status');$('#safetyBox').innerHTML=Object.entries(s.safety||{}).map(([k,v])=>`<div class="item"><div class="t">${k}</div><div class="m">${v}</div></div>`).join('');}
}
window.issueKey=async id=>{const r=await post('/apps/'+id+'/api-key-preview');alert((r.isDemo?'DEMO key (one-time):\n':'Key (one-time):\n')+(r.apiKeyOneTime||'')+'\n\n'+(r.note||''));load('apps');};
window.revoke=async id=>{await post('/apps/'+id+'/revoke-preview');load('apps');};
window.testWh=async id=>{const r=await post('/webhooks/'+id+'/test-preview',{eventType:'public_funnel.lead_created'});alert('Delivery status: '+(r.delivery&&r.delivery.status)+' (dryRun='+(r.delivery&&r.delivery.dryRun)+')');};
window.loadDeliv=async id=>{document.querySelectorAll('.dp-tabs button').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));$('#deliveries').classList.add('active');const d=await get(id?('/webhooks/'+id+'/deliveries'):'/dashboard');const arr=id?d.deliveries:[];$('#deliveryList').innerHTML=(arr||[]).map(x=>`<div class="item"><div class="t">${x.eventType} <span class="pill ${x.dryRun?'dry':''}">${x.status}</span></div><div class="m">${x.createdAt} · sig ${x.signaturePreview||''}</div></div>`).join('')||'<div class="item">Open a webhook → Deliveries to view simulated logs.</div>';};

$('#createApp').onclick=async()=>{await post('/apps',{name:$('#appName').value||'Untitled',appType:$('#appType').value});load('apps');};
$('#createWh').onclick=async()=>{const ev=($('#whEvents').value||'').split(',').map(s=>s.trim()).filter(Boolean);const r=await post('/webhooks',{url:$('#whUrl').value,eventTypes:ev});if(!r.success)alert(r.error);load('webhooks');};

loadStatus();load('overview');
