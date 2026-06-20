// public/js/compliance-center.js — Frontend for the Compliance & Consent Center.
const API='/api/compliance';
async function api(p,m='GET',b){ try{ const r=await fetch(API+p,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}); return await r.json(); }catch(e){ return {ok:false,error:e.message}; } }
const Compliance={
  async init(){ await this.loadSummary(); await this.loadRules(); await this.loadRegistry(); await this.loadAudit(); },
  async loadSummary(){
    const r=await api('/summary'); const s=r.summary||{};
    document.getElementById('cc-pill').textContent = s.consentFirst?'Consent-first ✓':'Open mode';
    const cb=s.consentByChannel||{};
    const cards=[['Subjects',s.totalSubjects||0],['Opted out',s.optedOut||0],['WhatsApp consent',cb.whatsapp||0],['Voice consent',cb.voice||0],['Marketing consent',cb.marketing||0]];
    document.getElementById('cc-overview').innerHTML=cards.map(([l,n])=>`<div class="cc-stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');
  },
  async loadRules(){ const r=await api('/rules'); document.getElementById('cc-rules').innerHTML=(r.rules||[]).map(x=>`<div class="cc-rule"><span class="sev">[${x.severity}]</span> ${x.label}</div>`).join(''); },
  async loadRegistry(){ const r=await api('/registry'); document.querySelector('#cc-registry tbody').innerHTML=(r.records||[]).map(c=>`<tr><td>${c.subjectId}</td><td class="${c.channels.whatsapp?'yes':'no'}">${c.channels.whatsapp?'✓':'—'}</td><td class="${c.channels.voice?'yes':'no'}">${c.channels.voice?'✓':'—'}</td><td class="${c.channels.marketing?'yes':'no'}">${c.channels.marketing?'✓':'—'}</td><td>${c.optedOut?'<span class="no">opted out</span>':'—'}</td></tr>`).join('')||'<tr><td colspan="5" style="color:var(--muted)">No consent records yet.</td></tr>'; },
  async check(){ const subjectId=document.getElementById('pc-subject').value; const channel=document.getElementById('pc-channel').value; const r=await api('/check','POST',{subjectId,channel}); document.getElementById('pc-out').textContent=JSON.stringify(r.decision||r,null,2); },
  async setConsent(){ const subjectId=document.getElementById('mc-subject').value; const channels={whatsapp:document.getElementById('mc-whatsapp').checked,marketing:document.getElementById('mc-marketing').checked,email:document.getElementById('mc-email').checked}; const r=await api('/consent/'+encodeURIComponent(subjectId),'POST',{channels}); document.getElementById('mc-out').textContent=JSON.stringify(r.consent||r,null,2); this.loadRegistry(); this.loadSummary(); this.loadAudit(); },
  async optOut(){ const subjectId=document.getElementById('mc-subject').value; const r=await api('/opt-out/'+encodeURIComponent(subjectId),'POST',{}); document.getElementById('mc-out').textContent=JSON.stringify(r.consent||r,null,2); this.loadRegistry(); this.loadSummary(); this.loadAudit(); },
  async loadAudit(){ const r=await api('/audit?limit=15'); document.getElementById('cc-audit').innerHTML=(r.audit||[]).map(a=>`<div>${a.at} · <strong>${a.event}</strong> · ${a.meta&&a.meta.subjectId?a.meta.subjectId:''}</div>`).join('')||'<div>No audit events.</div>'; },
};
window.Compliance=Compliance;
document.addEventListener('DOMContentLoaded',()=>Compliance.init());
