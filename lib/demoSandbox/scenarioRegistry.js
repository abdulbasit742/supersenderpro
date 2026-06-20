// lib/demoSandbox/scenarioRegistry.js — Registry of guided demo scenarios.
// Each scenario is descriptive only; the runner builds local demo state from it (dry-run).
'use strict';
const now = () => new Date().toISOString();

const SCENARIOS = [
  { id:'ai_tools_reseller', title:'AI Tools Reseller Demo',
    description:'Sell ChatGPT/Claude/Midjourney plans via WhatsApp with demo orders & payments.',
    modulesUsed:['business','customers','orders','payments','whatsapp','kpi'],
    sampleData:'ai_tools_reseller', tourSteps:'whatsapp_automation', expectedOutcome:'See a reseller flow end-to-end (demo).', dryRun:true, createdAt:now() },
  { id:'ecommerce_store', title:'Ecommerce Store Demo',
    description:'Browse demo products, stock, price drops and flash sales.',
    modulesUsed:['business','ecommerce','orders','payments','kpi'], sampleData:'ecommerce_store',
    tourSteps:'business_owner', expectedOutcome:'Run a demo store with fake catalog & orders.', dryRun:true, createdAt:now() },
  { id:'whatsapp_channel_automation', title:'WhatsApp Channel Automation Demo',
    description:'Preview channel post drafts and admin commands (no sending).',
    modulesUsed:['whatsapp','channelAutomation','kpi'], sampleData:'ai_tools_reseller',
    tourSteps:'channel_automation', expectedOutcome:'Draft channel posts safely (dry-run).', dryRun:true, createdAt:now() },
  { id:'customer_360_support', title:'Customer 360 Support Demo',
    description:'View a unified demo customer profile with masked contact info.',
    modulesUsed:['customers','orders','payments','whatsapp'], sampleData:'ai_tools_reseller',
    tourSteps:'customer_360', expectedOutcome:'Explore a 360° demo customer record.', dryRun:true, createdAt:now() },
  { id:'voice_ai_reply', title:'Voice AI Reply Demo',
    description:'See a fake transcript and a demo voice reply draft (no real voice/provider).',
    modulesUsed:['voiceAI','customers'], sampleData:'ai_tools_reseller',
    tourSteps:'voice_ai', expectedOutcome:'Generate a demo voice reply draft.', dryRun:true, createdAt:now() },
  { id:'marketplace_seller_buyer', title:'Marketplace Seller/Buyer Demo',
    description:'Match demo seller offers with demo buyer requests; see SKU price changes.',
    modulesUsed:['marketplace','ecommerce','kpi'], sampleData:'wholesale_dealer',
    tourSteps:'business_owner', expectedOutcome:'See marketplace matching (demo).', dryRun:true, createdAt:now() },
  { id:'growth_campaign', title:'Growth Campaign Demo',
    description:'Plan a demo growth campaign across segments (no live sends).',
    modulesUsed:['customers','growthCampaign','kpi'], sampleData:'ai_tools_reseller',
    tourSteps:'growth_campaign', expectedOutcome:'Build a campaign plan safely.', dryRun:true, createdAt:now() },
  { id:'saas_billing', title:'SaaS Billing Demo',
    description:'Preview demo plans, tenant status, invoice draft and usage warnings.',
    modulesUsed:['saasBilling','kpi'], sampleData:'digital_agency',
    tourSteps:'saas_billing', expectedOutcome:'Explore billing without charging cards.', dryRun:true, createdAt:now() },
  { id:'owner_daily_briefing', title:'Owner Daily Briefing Demo',
    description:'See a demo owner briefing: revenue, orders, incidents, opportunities.',
    modulesUsed:['kpi','customers','orders'], sampleData:'ai_tools_reseller',
    tourSteps:'business_owner', expectedOutcome:'Read a demo daily briefing.', dryRun:true, createdAt:now() },
  { id:'incident_recovery', title:'Incident Recovery Demo',
    description:'Walk through a demo incident and recovery steps (no real systems touched).',
    modulesUsed:['kpi','channelAutomation'], sampleData:'ecommerce_store',
    tourSteps:'business_owner', expectedOutcome:'Practice incident recovery (demo).', dryRun:true, createdAt:now() },
];

function all(){ return SCENARIOS.map(s => ({ ...s })); }
function get(id){ return SCENARIOS.find(s => s.id === id) || null; }
function ids(){ return SCENARIOS.map(s => s.id); }

module.exports = { SCENARIOS, all, get, ids };
