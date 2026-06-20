// public/js/use-cases.js — render industry use cases; CTA links to setup preset preview.
(function () {
  var el = document.getElementById('usecases');
  function card(u){
    var mods = (u.modules||[]).map(function(m){return '<span class="pill">'+m+'</span>';}).join(' ');
    return '<div class="card">'+
      '<h3>'+u.name+'</h3>'+
      '<p><strong>Problem:</strong> '+(u.problem||'')+'</p>'+
      '<div style="margin:6px 0">'+mods+'</div>'+
      '<p><strong>Workflow:</strong> '+(u.workflow||'')+'</p>'+
      '<p><strong>Benefits:</strong> '+(u.benefits||'')+'</p>'+
      '<p style="margin-top:10px"><a class="btn btn-primary" href="/start.html?type='+encodeURIComponent(u.preset||u.key)+'">Start Setup Preset</a></p>'+
    '</div>';
  }
  fetch('/api/public-funnel/use-cases').then(function(r){return r.json();}).then(function(d){
    if(d && d.ok && d.useCases){ el.innerHTML = d.useCases.map(card).join(''); }
    else el.innerHTML = '<p class="lead">Use cases unavailable right now.</p>';
  }).catch(function(){ el.innerHTML = '<p class="lead">Use cases unavailable right now.</p>'; });
})();
