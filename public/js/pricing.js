// public/js/pricing.js — render plan cards from SaaS Billing (via API) and request a plan (lead only).
(function () {
  var el = document.getElementById('plans');
  var note = document.getElementById('plan-note');
  var currency = 'PKR';

  function price(p){
    if(!p.price || p.price===0) return (p.cycle==='custom'||p.id==='reseller'||p.id==='enterprise'||p.id==='custom')?'Custom':'Free';
    return currency+' '+p.price.toLocaleString();
  }
  function card(p){
    var hl = (p.highlights||[]).map(function(h){return '<span class="pill">'+h+'</span>';}).join(' ');
    return '<div class="card">'+
      '<h3>'+p.name+'</h3>'+
      '<div style="font-size:24px;font-weight:800">'+price(p)+'<span style="font-size:13px;color:var(--muted);font-weight:600"> / '+(p.cycle||'monthly')+'</span></div>'+
      (p.bestFor?('<p style="margin-top:6px"><strong>Best for:</strong> '+p.bestFor+'</p>'):'')+
      '<div style="margin:8px 0">'+hl+'</div>'+
      '<p><strong>Limits:</strong> '+(p.limits||'See sales')+'</p>'+
      '<p><strong>Trial:</strong> '+(p.trial?'Available':'On request')+'</p>'+
      '<div class="cta-row" style="margin-top:10px">'+
        '<button class="btn btn-primary" data-plan="'+p.id+'">Request Plan</button>'+
        '<a class="btn btn-ghost" href="/start.html">Talk to Sales</a>'+
      '</div>'+
    '</div>';
  }
  function bind(){
    el.querySelectorAll('button[data-plan]').forEach(function(b){
      b.addEventListener('click', function(){
        window.location.href = '/start.html?plan='+encodeURIComponent(b.getAttribute('data-plan'));
      });
    });
  }
  fetch('/api/public-funnel/plans').then(function(r){return r.json();}).then(function(d){
    if(d && d.ok && d.plans){
      currency = d.currency || 'PKR';
      el.innerHTML = d.plans.map(card).join('');
      bind();
      note.textContent = 'Plan source: '+(d.source==='saas_billing'?'live SaaS Billing registry':'safe fallback catalogue')+'. Requesting a plan creates a lead only — no payment is captured and no subscription is created.';
    } else { el.innerHTML = '<p class="lead">Plans unavailable right now.</p>'; }
  }).catch(function(){ el.innerHTML = '<p class="lead">Plans unavailable right now.</p>'; });
})();
