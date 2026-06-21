'use strict';
const cfg = require('./config');
const ADAPTERS = [
 { key:'campaigns', file:/campaign|broadcast/i }, { key:'contacts', file:/contact|customer/i }, { key:'whatsapp', file:/baileys|whatsapp(?!cloud)/i }, { key:'whatsappCloud', file:/cloud|meta|graph/i },
 { key:'templates', file:/template/i }, { key:'ecommerce', file:/ecommerce|order|cart|shop/i }, { key:'invoices', file:/invoice|payment/i }, { key:'crm', file:/crm|customer.?360/i },
 { key:'ai', file:/llm|\bai\b|openai|anthropic|gemini|groq|ollama/i }, { key:'workflow', file:/workfloworchestrator|workflow-orchestrator/i }, { key:'platformControl', file:/platformcontrol|platform-control/i },
 { key:'inbox', file:/inbox/i }, { key:'analytics', file:/analytics/i }, { key:'audit', file:/audit|log/i }
];
function detect(){ const out={}; const warnings=[]; ADAPTERS.forEach(a=>{ const available=cfg.hasFile([a.file]); out[a.key]={availablePreview:available}; if(!available) warnings.push(a.key+': module_not_available'); }); return { adapters:out, warnings }; }
function loadCampaigns(){ const data=cfg.readJSON('data/campaigns.json') || cfg.readJSON('data/campaign-intelligence.json') || {campaigns:[]}; const arr=Array.isArray(data)?data:(data.campaigns||[]); return Array.isArray(arr)?arr:[]; }
function emptyPreview(moduleKey){ return { availablePreview:false, dataPreview:null, warning:'module_not_available', moduleKey }; }
module.exports={ detect, loadCampaigns, emptyPreview, ADAPTERS };
