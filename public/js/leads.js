// public/js/leads.js — admin Lead Command Center. Sends x-admin-secret if provided.
// Renders masked data only. Generates follow-up DRAFTS (never sends). No raw PII export.
(function () {
  function secret(){ return document.getElementById('adminSecret').value.trim(); }
  function headers(){ var h={'Content-Type':'application/json'}; var s=secret(); if(s) h['x-admin-secret']=s; return h; }
  function esc(v){ return (v==null?'':String(v)).replace(/[<>&]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];}); }

  function loadKpis(){
    fetch('/api/public-funnel/kpis').then(function(r){return r.json();}).then(function(d){
      if(!(d&&d.ok)) return;
      var k=d.kpis;
      var tiles=[['Total Leads',k.totalLeads],['Demo Requests',k.demoRequests],['Trial Requests',k.trialRequests],['Qualified',k.qualifiedLeads],['Hot Leads',k.hotLeads],['Conv %',k.requestConversionRatePct]];
      document.getElementById('kpis').innerHTML = tiles.map(function(t){return '<div class="kpi"><div class="n">'+t[1]+'</div><div class="l">'+t[0]+'</div></div>';}).join('');
    });
  }

  function loadLeads(){
    fetch('/api/public-funnel/leads',{headers:headers()}).then(function(r){return r.json();}).then(function(d){
      var tb=document.querySelector('#leadsTable tbody');
      if(!(d&&d.ok)||!d.leads.length){ tb.innerHTML='<tr><td colspan="8" class="lead">No leads.</td></tr>'; return; }
      tb.innerHTML = d.leads.map(function(l){
        var name = d.admin ? (l.nameSafe||'—') : '—';
        return '<tr data-id="'+l.id+'" class="lead-row" style="cursor:pointer">'+
          '<td>'+esc(name)+'</td><td>'+esc(l.businessType)+'</td><td>'+esc(l.interestedPlan||'')+'</td>'+
          '<td>'+esc(l.sourcePage)+'</td><td>'+esc(l.score)+'</td>'+
          '<td><span class="badge '+(l.grade||'cold')+'">'+esc(l.grade||'')+'</span></td>'+
          '<td>'+esc(l.status)+'</td><td>'+esc((l.createdAt||'').slice(0,10))+'</td></tr>';
      }).join('');
      if(!d.admin){ document.getElementById('exportBox').innerHTML='<div class="msg err">No admin secret set/valid — showing redacted view. Names &amp; masked contacts are hidden.</div>'; }
      tb.querySelectorAll('.lead-row').forEach(function(row){ row.addEventListener('click',function(){ detail(row.getAttribute('data-id')); }); });
    });
  }

  function detail(id){
    fetch('/api/public-funnel/leads/'+id,{headers:headers()}).then(function(r){return r.json();}).then(function(d){
      if(!(d&&d.ok)) return;
      var l=d.lead;
      var box=document.getElementById('leadDetail');
      box.innerHTML='<div class="card"><h3>Lead detail</h3>'+
        '<p><strong>Name:</strong> '+esc(l.nameSafe||'—')+' · <strong>Business:</strong> '+esc(l.businessName||'—')+'</p>'+
        '<p><strong>Contact (masked):</strong> '+esc(l.emailMasked||'—')+' / '+esc(l.phoneMasked||'—')+'</p>'+
        '<p><strong>Modules:</strong> '+(l.interestedModules||[]).map(esc).join(', ')+'</p>'+
        '<p><strong>Message:</strong> '+esc(l.messagePreview||'—')+'</p>'+
        '<p><strong>Consent:</strong> contact='+(l.consentContact)+' marketing='+(l.consentMarketing)+'</p>'+
        '<p><strong>Score:</strong> '+esc(l.score)+' ('+esc(l.grade)+') · <strong>Next:</strong> '+esc(l.nextAction||'')+'</p>'+
        '<div class="cta-row"><button class="btn btn-ghost" id="dWa">WhatsApp Draft</button>'+
          '<button class="btn btn-ghost" id="dEmail">Email Draft</button></div>'+
        '<div id="draftOut"></div></div>';
      function draft(type){
        fetch('/api/public-funnel/leads/'+id+'/followup-draft',{method:'POST',headers:headers(),body:JSON.stringify({type:type})})
          .then(function(r){return r.json();}).then(function(dd){
            var o=document.getElementById('draftOut');
            if(dd&&dd.ok){ var x=dd.draft;
              o.innerHTML = x.blocked
                ? '<div class="msg err">⚠️ '+esc(x.adminReviewNote||x.reason)+'</div>'
                : '<div class="msg ok"><strong>DRAFT (not sent):</strong><br><pre style="white-space:pre-wrap;margin:6px 0 0">'+esc(x.draft)+'</pre></div>';
            }
          });
      }
      document.getElementById('dWa').addEventListener('click',function(){draft('whatsapp');});
      document.getElementById('dEmail').addEventListener('click',function(){draft('email');});
    });
  }

  function loadDemos(){
    fetch('/api/public-funnel/demo-requests',{headers:headers()}).then(function(r){return r.json();}).then(function(d){
      var tb=document.querySelector('#demoTable tbody');
      if(!(d&&d.ok)||!d.demoRequests.length){ tb.innerHTML='<tr><td colspan="4" class="lead">No demo requests.</td></tr>'; return; }
      tb.innerHTML=d.demoRequests.map(function(x){return '<tr><td>'+esc(x.id)+'</td><td>'+esc(x.businessType)+'</td><td>'+esc(x.status)+'</td><td>'+esc((x.createdAt||'').slice(0,10))+'</td></tr>';}).join('');
    });
  }
  function loadTrials(){
    fetch('/api/public-funnel/trial-requests',{headers:headers()}).then(function(r){return r.json();}).then(function(d){
      var tb=document.querySelector('#trialTable tbody');
      if(!(d&&d.ok)||!d.trialRequests.length){ tb.innerHTML='<tr><td colspan="5" class="lead">No trial requests.</td></tr>'; return; }
      tb.innerHTML=d.trialRequests.map(function(x){return '<tr><td>'+esc(x.id)+'</td><td>'+esc(x.requestedPlan)+'</td><td>'+esc(x.businessType)+'</td><td>'+esc(x.status)+'</td><td>'+esc((x.createdAt||'').slice(0,10))+'</td></tr>';}).join('');
    });
  }

  document.getElementById('loadBtn').addEventListener('click',function(){ loadKpis(); loadLeads(); loadDemos(); loadTrials(); });
  document.getElementById('exportBtn').addEventListener('click',function(){
    fetch('/api/public-funnel/report/generate',{method:'POST',headers:headers(),body:JSON.stringify({format:'markdown'})})
      .then(function(r){return r.json();}).then(function(d){
        if(d&&d.ok){ document.getElementById('exportBox').innerHTML='<div class="card"><h3>Redacted export</h3><pre style="white-space:pre-wrap;overflow-x:auto">'+esc(d.report)+'</pre><div class="safety-note">'+esc(d.note||'')+'</div></div>'; }
      });
  });
  // auto-load redacted on open
  loadKpis(); loadLeads(); loadDemos(); loadTrials();
})();
