/* public/js/demo-tour.js — Reusable guided tour engine. Highlights elements if present,
   else shows a centered fallback card. Talks to /api/demo-sandbox/tours. No live actions. */
(function(global){
  const API = '/api/demo-sandbox';
  let state = { tourId:null, steps:[], index:0 };

  function el(tag, cls, html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function ensureNodes(){
    if (document.getElementById('dtour-backdrop')) return;
    const bd=el('div','dtour-backdrop'); bd.id='dtour-backdrop';
    const hl=el('div','dtour-highlight'); hl.id='dtour-highlight'; hl.style.display='none';
    const card=el('div','dtour-card'); card.id='dtour-card'; card.style.display='none';
    document.body.append(bd,hl,card);
    bd.addEventListener('click', stop);
  }
  function position(card, target){
    if (!target){ card.classList.add('center'); card.style.top=''; card.style.left=''; return; }
    card.classList.remove('center');
    const r=target.getBoundingClientRect();
    let top=r.bottom+12, left=r.left;
    if (top+220>window.innerHeight) top=Math.max(12,r.top-220);
    if (left+360>window.innerWidth) left=Math.max(12,window.innerWidth-360);
    card.style.top=top+'px'; card.style.left=left+'px';
  }
  function render(){
    ensureNodes();
    const bd=document.getElementById('dtour-backdrop');
    const hl=document.getElementById('dtour-highlight');
    const card=document.getElementById('dtour-card');
    const step=state.steps[state.index]; if(!step){ stop(); return; }
    bd.classList.add('show');
    const target=step.selector?document.querySelector(step.selector):null;
    if (target){ const r=target.getBoundingClientRect(); hl.style.display='block';
      hl.style.top=(r.top-4)+'px'; hl.style.left=(r.left-4)+'px'; hl.style.width=(r.width+8)+'px'; hl.style.height=(r.height+8)+'px';
      target.scrollIntoView({behavior:'smooth',block:'center'});
    } else { hl.style.display='none'; }
    const prog=Math.round(((state.index+1)/state.steps.length)*100);
    card.style.display='block';
    card.innerHTML=`<div class="dtour-prog"><div style="width:${prog}%"></div></div>
      <div class="dtour-step">Step ${state.index+1} of ${state.steps.length}${step.optional?' · optional':''}</div>
      <h3>${step.title||''}</h3><p>${step.description||''}</p>
      ${step.actionHint?`<div class="dtour-hint">💡 ${step.actionHint}</div>`:''}
      <div class="dtour-actions">
        <div class="left"><button class="dtour-btn ghost" id="dtour-prev" ${state.index===0?'disabled':''}>Back</button>
          <button class="dtour-btn ghost" id="dtour-skip">Skip</button></div>
        <button class="dtour-btn" id="dtour-next">${state.index===state.steps.length-1?'Finish':'Next'}</button></div>`;
    position(card, target);
    document.getElementById('dtour-prev').onclick=()=>go('prev');
    document.getElementById('dtour-skip').onclick=stop;
    document.getElementById('dtour-next').onclick=()=> state.index===state.steps.length-1?finish():go('next');
    if (step.page && step.page!==location.pathname && !step.selector){ /* page hint only; do not auto-navigate */ }
  }
  function go(dir){ state.index = dir==='prev'?Math.max(0,state.index-1):Math.min(state.steps.length-1,state.index+1);
    fetch(`${API}/tours/${state.tourId}/step`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({direction:dir})}).catch(()=>{});
    render(); }
  async function start(tourId){
    ensureNodes();
    try{ const r=await fetch(`${API}/tours/${tourId}`).then(x=>x.json());
      state={ tourId, steps:(r.tour&&r.tour.steps)||[], index:0 };
      fetch(`${API}/tours/${tourId}/start`,{method:'POST'}).catch(()=>{});
      if(!state.steps.length){ alert('No steps for this tour.'); return; }
      render();
    }catch(e){ console.warn('tour load failed',e); }
  }
  function finish(){ if(state.tourId) fetch(`${API}/tours/${state.tourId}/finish`,{method:'POST'}).catch(()=>{}); stop(); }
  function stop(){ const bd=document.getElementById('dtour-backdrop'); const hl=document.getElementById('dtour-highlight'); const card=document.getElementById('dtour-card');
    if(bd)bd.classList.remove('show'); if(hl)hl.style.display='none'; if(card)card.style.display='none'; }

  global.DemoTour={ start, stop, finish };
})(window);
