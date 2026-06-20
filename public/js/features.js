// public/js/features.js — render feature cards from the public funnel API.
(function () {
  var el = document.getElementById('features');
  function card(f){
    return '<div class="card">'+
      '<h3>'+f.name+'</h3>'+
      '<p><strong>What:</strong> '+(f.what||'')+'</p>'+
      '<p><strong>Who:</strong> '+(f.who||'')+'</p>'+
      '<p><strong>Example:</strong> '+(f.example||'')+'</p>'+
      (f.safety?('<div class="safety-note">🛡 '+f.safety+'</div>'):'')+
      '<p style="margin-top:10px"><a class="btn btn-ghost" href="/start.html">'+(f.cta||'Request Demo')+'</a></p>'+
    '</div>';
  }
  fetch('/api/public-funnel/features').then(function(r){return r.json();}).then(function(d){
    if(d && d.ok && d.features){ el.innerHTML = d.features.map(card).join(''); }
    else el.innerHTML = '<p class="lead">Features unavailable right now.</p>';
  }).catch(function(){ el.innerHTML = '<p class="lead">Features unavailable right now.</p>'; });
})();
