'use strict';
const API = '/api/public-funnel';
const $ = (s) => document.querySelector(s);
const j = (u, o) => fetch(u, o).then((r) => r.json());
async function loadPricing() { const el = $('#pricing-grid'); if (!el) return; const { plans } = await j(API +
'/pricing'); el.innerHTML = plans.map((p) => `<div class="card"><h3>${p.name}</h3><div class="price">${p.currency}
${p.price}<span class="muted">/${p.period}</span></div><ul>${(p.features||[]).map((f)=>`<li>${f}</li>`).join('')}</ul><a
class="cta" href="/start.html?plan=${p.id}">Start</a></div>`).join(''); }
async function submitForm(intent, formId, resultId) {
  const f = $(formId); if (!f) return;
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!f.querySelector('[name=consent]').checked) { $(resultId).textContent = 'Please tick the consent box.'; return; }
    const body = { name: f.querySelector('[name=name]')?.value, email: f.querySelector('[name=email]')?.value, phone:
f.querySelector('[name=phone]')?.value, businessType: f.querySelector('[name=businessType]')?.value, planInterest: new
URLSearchParams(location.search).get('plan'), consent: true };
    const path = intent === 'trial' ? '/trial-request' : intent === 'demo' ? '/demo-request' : '/lead';
    const r = await j(API + path, { method:'POST', headers:{'Content-Type':'application/json'}, body:
JSON.stringify(body) });
    $(resultId).textContent = r.ok ? (r.note + ' (ref ' + r.leadId + ')') : 'Please check the form.';
    f.reset();

  });
}
loadPricing();
submitForm('lead', '#lead-form', '#lead-result');
submitForm('trial', '#start-form', '#start-result');
