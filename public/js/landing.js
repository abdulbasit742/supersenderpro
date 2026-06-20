// public/js/landing.js — populate core modules from the public funnel config (with static fallback).
(function () {
  var fallback = ['WhatsApp Automation','Channel Automation','Customer 360','Voice AI','Marketplace Intelligence','AI Agent Deployment','Owner Command','Growth Campaigns','SaaS Billing','Business Setup Wizard','Compliance Center','KPI Command'];
  var blurbs = {
    'WhatsApp Automation':'Automate replies & follow-ups (drafts by default).',
    'Channel Automation':'Plan & schedule channel posts with approvals.',
    'Customer 360':'One unified, masked view of every customer.',
    'Voice AI':'Voice scripts & voiceovers, safely.',
    'Marketplace Intelligence':'Track competitors & marketplace signals.',
    'AI Agent Deployment':'Guardrailed AI agents for repetitive work.',
    'Owner Command':'Daily briefing with the top actions.',
    'Growth Campaigns':'Opted-in audiences, dry-run campaigns.',
    'SaaS Billing':'Plans, trials & upgrade requests.',
    'Business Setup Wizard':'Industry presets & readiness checklists.',
    'Compliance Center':'Consent, opt-out & privacy masking.',
    'KPI Command':'Track growth & conversion metrics.'
  };
  function render(modules){
    var el = document.getElementById('modules');
    if(!el) return;
    el.innerHTML = modules.map(function(m){
      return '<div class="card"><h3>'+m+'</h3><p>'+(blurbs[m]||'')+'</p></div>';
    }).join('');
  }
  render(fallback);
  fetch('/api/public-funnel/config').then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(d && d.config && Array.isArray(d.config.featuredModules) && d.config.featuredModules.length){
      render(d.config.featuredModules);
    }
  }).catch(function(){});
})();
