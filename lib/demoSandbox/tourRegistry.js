// lib/demoSandbox/tourRegistry.js — Guided product tours (steps reference existing pages).
// Tours never modify pages; the UI highlights a selector if present, else shows a fallback card.
'use strict';
function step(id, page, selector, title, description, actionHint, nextStepId, moduleId, optional=false){
  return { id, page, selector, title, description, actionHint, nextStepId, optional, moduleId };
}

const TOURS = [
  { id:'full_product', title:'Full Product Tour',
    steps:[
      step('fp1','/demo-sandbox.html','#demo-overview','Welcome to the Demo','This is a safe demo sandbox — all data is fake and no live actions run.','Click Next to begin.','fp2','demo'),
      step('fp2','/demo-sandbox.html','#scenario-launcher','Scenario Launcher','Start any business scenario with one click.','Pick a scenario card.','fp3','demo'),
      step('fp3','/owner-briefing','#kpi','Owner Command','Owners see revenue, orders and opportunities here.','Review the demo KPIs.','fp4','kpi'),
      step('fp4','/customer-360',null,'Customer 360','A unified view of each demo customer.','Open a customer record.','fp5','customers'),
      step('fp5','/channel-automation',null,'Channel Automation','Draft channel posts safely (no sending in demo).','See the demo drafts.',null,'channelAutomation'),
    ] },
  { id:'business_owner', title:'Business Owner Tour',
    steps:[ step('bo1','/owner-briefing','#kpi','Daily Briefing','Your morning snapshot of the business.','Read the briefing.','bo2','kpi'),
            step('bo2','/store.html',null,'Orders & Payments','Track demo orders and payment statuses.','Scan recent orders.',null,'orders') ] },
  { id:'whatsapp_automation', title:'WhatsApp Automation Tour',
    steps:[ step('wa1','/channel-automation',null,'WhatsApp Inbox','Preview demo chats and group messages.','Open a chat preview.','wa2','whatsapp'),
            step('wa2','/channel-automation',null,'Admin Commands','Run demo admin commands like /stock.','Try a command (demo).',null,'whatsapp') ] },
  { id:'channel_automation', title:'Channel Automation Tour',
    steps:[ step('ca1','/channel-automation',null,'Channel Drafts','Compose channel post drafts.','Open a draft.','ca2','channelAutomation'),
            step('ca2','/channel-automation',null,'Safe Publish','Publishing is blocked in demo (dry-run).','See the blocked notice.',null,'channelAutomation') ] },
  { id:'customer_360', title:'Customer 360 Tour',
    steps:[ step('c3-1','/customer-360',null,'Profile','Masked contact info keeps demo privacy-safe.','Open a profile.','c3-2','customers'),
            step('c3-2','/customer-360',null,'History','See demo orders, payments and chats together.','Review the timeline.',null,'customers') ] },
  { id:'voice_ai', title:'Voice AI Tour',
    steps:[ step('va1','/voice-ai',null,'Transcript','A fake transcript — no real call happened.','Read the transcript.','va2','voiceAI'),
            step('va2','/voice-ai',null,'Reply Draft','A demo voice reply draft (not sent).','See the draft.',null,'voiceAI') ] },
  { id:'growth_campaign', title:'Growth Campaign Tour',
    steps:[ step('gc1','/owner-briefing',null,'Segments','Pick demo customer segments.','Choose a segment.','gc2','growthCampaign'),
            step('gc2','/owner-briefing',null,'Plan','Build a campaign plan (no live sends).','Review the plan.',null,'growthCampaign') ] },
  { id:'saas_billing', title:'SaaS Billing Tour',
    steps:[ step('sb1','/re-dashboard.html',null,'Plans','Demo plans and pricing.','Compare plans.','sb2','saasBilling'),
            step('sb2','/re-dashboard.html',null,'Invoice Draft','A demo invoice — no card is charged.','Open the draft.',null,'saasBilling') ] },
  { id:'kpi_command', title:'KPI Command Tour',
    steps:[ step('kc1','/owner-briefing','#kpi','KPI Overview','Revenue, orders, customers, incidents.','Scan the KPIs.',null,'kpi') ] },
  { id:'public_funnel', title:'Public Funnel Tour',
    steps:[ step('pf1','/','.demo-cta','Try Demo CTA','The public funnel links here to the demo.','Click Try Demo.','pf2','demo'),
            step('pf2','/demo-sandbox.html','#demo-overview','Demo Home','You landed in the safe demo sandbox.','Start a scenario.',null,'demo') ] },
];

function all(){ return TOURS.map(t => ({ id:t.id, title:t.title, steps:t.steps.length })); }
function get(id){ return TOURS.find(t => t.id === id) || null; }
function ids(){ return TOURS.map(t => t.id); }

module.exports = { TOURS, all, get, ids };
