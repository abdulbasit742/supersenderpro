// public/js/start.js — self-serve onboarding wizard.
// Generates a setup preview (preview-only) and submits a lead + trial/demo request.
// Enforces consent before any submission. Never sends messages or creates a live tenant.
(function () {
  var state = { step: 1, type: null, goal: null, modules: [], plan: null, leadId: null };
  var totalSteps = 6;

  var TYPES = [
    {k:'ecommerce',n:'Ecommerce Store'},{k:'ai_tools_reseller',n:'AI Tools Reseller'},
    {k:'wholesale',n:'Wholesale Dealer'},{k:'education',n:'Education / Scholarship'},
    {k:'jobs',n:'Jobs Channel'},{k:'agency',n:'Digital Agency'},
    {k:'restaurant',n:'Restaurant / Food'},{k:'real_estate',n:'Real Estate'},
    {k:'content',n:'Content / Sticker Channel'},{k:'local_shop',n:'Local Shop'},
    {k:'service',n:'Service Business'},{k:'custom',n:'Custom Business'}
  ];
  var GOALS = ['more sales','automate support','manage WhatsApp','post to channels/social','manage ecommerce','track payments/orders','launch SaaS/reseller'];
  var MODULES = ['whatsapp_crm','whatsapp_channels','ecommerce_automation','customer_360','voice_ai','marketplace_intel','ai_agents','playbooks','owner_command','kpi_analytics','saas_billing','compliance_safety'];

  function qs(name){ return new URLSearchParams(location.search).get(name); }

  function renderChoices(elId, items, key, multi){
    var el = document.getElementById(elId);
    el.innerHTML = items.map(function(it){
      var k = it.k || it; var label = it.n || it;
      return '<button type="button" class="choice" data-k="'+k+'">'+label+'</button>';
    }).join('');
    el.querySelectorAll('.choice').forEach(function(b){
      b.addEventListener('click', function(){
        var k = b.getAttribute('data-k');
        if(multi){
          var i = state.modules.indexOf(k);
          if(i>=0){ state.modules.splice(i,1); b.classList.remove('active'); }
          else { state.modules.push(k); b.classList.add('active'); }
        } else {
          el.querySelectorAll('.choice').forEach(function(x){x.classList.remove('active');});
          b.classList.add('active');
          state[key] = k;
        }
      });
    });
  }

  function loadPlans(){
    fetch('/api/public-funnel/plans').then(function(r){return r.json();}).then(function(d){
      var items = (d && d.plans ? d.plans : []).map(function(p){return {k:p.id,n:p.name};});
      if(!items.length) items = [{k:'free_trial',n:'Free Trial'},{k:'growth',n:'Growth'},{k:'pro',n:'Pro'},{k:'agency',n:'Agency'}];
      renderChoices('planGrid', items, 'plan', false);
      var pre = qs('plan'); if(pre){ state.plan = pre; }
    });
  }

  function show(step){
    state.step = step;
    document.querySelectorAll('.wstep').forEach(function(s){
      s.hidden = (parseInt(s.getAttribute('data-step'),10) !== step);
    });
    document.getElementById('backBtn').hidden = (step === 1);
    var next = document.getElementById('nextBtn');
    next.hidden = (step === totalSteps);
    if(step === totalSteps) buildPreview();
  }

  function validateStep(){
    if(state.step===1 && !state.type){ alert('Please choose a business type.'); return false; }
    if(state.step===2 && !state.goal){ alert('Please choose a goal.'); return false; }
    if(state.step===5){
      var f = document.getElementById('contactForm');
      var email = f.email.value.trim(); var phone = f.phone.value.trim();
      if(!email && !phone){ alert('Please provide an email or phone so we can follow up.'); return false; }
      if(!document.getElementById('consentContact').checked){ alert('Please agree to be contacted to continue.'); return false; }
    }
    return true;
  }

  function leadPayload(sourcePage){
    var f = document.getElementById('contactForm');
    return {
      name: f.name.value.trim(), businessName: f.businessName.value.trim(),
      businessType: state.type, email: f.email.value.trim(), phone: f.phone.value.trim(),
      country: f.country.value.trim(), city: f.city.value.trim(),
      interestedPlan: state.plan, interestedModules: state.modules,
      message: f.message.value.trim(), sourcePage: sourcePage,
      consentContact: document.getElementById('consentContact').checked,
      consentMarketing: document.getElementById('consentMarketing').checked
    };
  }

  function ensureLead(cb){
    if(state.leadId) return cb(state.leadId);
    fetch('/api/public-funnel/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(leadPayload('start'))})
      .then(function(r){return r.json();}).then(function(d){
        if(d && d.ok && d.lead){ state.leadId = d.lead.id; cb(state.leadId); }
        else { document.getElementById('result').innerHTML = '<div class="msg err">Could not save your details: '+((d&&d.errors)||['error']).join(', ')+'</div>'; }
      }).catch(function(){ document.getElementById('result').innerHTML = '<div class="msg err">Network error. Please try again.</div>'; });
  }

  function buildPreview(){
    var box = document.getElementById('previewBox');
    fetch('/api/public-funnel/onboarding/preview',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({businessType:state.type,goal:state.goal,modules:state.modules,planInterest:state.plan})})
      .then(function(r){return r.json();}).then(function(d){
        if(!(d && d.ok)){ box.innerHTML='<p class="lead">Preview unavailable.</p>'; return; }
        var p = d.preview;
        var mods = (p.recommendedModules||[]).map(function(m){return '<span class="pill">'+(m.name||m)+'</span>';}).join(' ');
        var pb = (p.recommendedPlaybooks||[]).map(function(x){return '<span class="pill">'+x+'</span>';}).join(' ');
        var chk = (p.setupChecklist||[]).map(function(c){return '<li>'+(c.item||c)+(c.required?' <em>(required)</em>':'')+'</li>';}).join('');
        box.innerHTML =
          '<h3>Recommended for '+(state.type||'your business')+'</h3>'+
          '<p><strong>Modules:</strong></p><div>'+mods+'</div>'+
          '<p style="margin-top:8px"><strong>Playbooks:</strong></p><div>'+pb+'</div>'+
          (p.recommendedPlan?('<p style="margin-top:8px"><strong>Recommended plan:</strong> '+p.recommendedPlan.name+'</p>'):'')+
          '<p style="margin-top:8px"><strong>Setup checklist:</strong></p><ul>'+chk+'</ul>'+
          '<div class="safety-note">'+(p.note||'Preview only — nothing was activated.')+'</div>';
      }).catch(function(){ box.innerHTML='<p class="lead">Preview unavailable.</p>'; });
  }

  function submit(kind){
    var resEl = document.getElementById('result');
    ensureLead(function(leadId){
      var url = kind==='trial' ? '/api/public-funnel/trial-request' : '/api/public-funnel/demo-request';
      var body = kind==='trial'
        ? {leadId:leadId,requestedPlan:state.plan,businessType:state.type,modules:state.modules,goal:state.goal}
        : {leadId:leadId,businessType:state.type,requestedModules:state.modules};
      fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        .then(function(r){return r.json();}).then(function(d){
          if(d && d.ok){
            resEl.innerHTML = '<div class="msg ok">✅ '+(d.message||'Request received!')+' Our team will follow up. (Nothing was activated or sent.)</div>';
          } else {
            resEl.innerHTML = '<div class="msg err">'+((d&&d.errors)||['Could not submit']).join(', ')+'</div>';
          }
        }).catch(function(){ resEl.innerHTML='<div class="msg err">Network error. Please try again.</div>'; });
    });
  }

  document.getElementById('nextBtn').addEventListener('click', function(){ if(validateStep()) show(Math.min(totalSteps, state.step+1)); });
  document.getElementById('backBtn').addEventListener('click', function(){ show(Math.max(1, state.step-1)); });
  document.getElementById('submitTrial').addEventListener('click', function(){ submit('trial'); });
  document.getElementById('submitDemo').addEventListener('click', function(){ submit('demo'); });

  // init
  renderChoices('typeGrid', TYPES, 'type', false);
  renderChoices('goalGrid', GOALS, 'goal', false);
  renderChoices('moduleGrid', MODULES, 'modules', true);
  loadPlans();
  var preType = qs('type'); if(preType){ state.type = preType; }
  show(1);
})();
