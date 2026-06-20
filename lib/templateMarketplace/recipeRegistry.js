// lib/templateMarketplace/recipeRegistry.js — Automation recipe registry (dry-run, draft-only by default).
'use strict';
const { paths }=require('./config');
const { readJSON, writeJSON, appendHistory }=require('./store');
const now=()=>new Date().toISOString();
function rcp(o){ return Object.assign({ approvalRequired:true, dryRun:true, riskLevel:'low',
  modulesUsed:[], conditions:[], complianceNotes:'Draft-only; no live send/payment/tenant by default.',
  sampleInput:{}, sampleOutput:{}, createdAt:now() }, o); }
const DEFAULT_RECIPES=[
  rcp({ id:'rcp_new_lead_followup', title:'New lead → Customer 360 preview → follow-up draft', trigger:'lead.created',
    actions:['preview_customer_360','draft_followup_message'], modulesUsed:['customer360','channelAutomation'],
    sampleInput:{lead:'(Demo)'}, sampleOutput:{draft:'[DEMO] Salam! Shukria interest dikhane ka...'} }),
  rcp({ id:'rcp_new_order_owner_alert', title:'New order → WhatsApp draft → owner alert', trigger:'order.created',
    actions:['draft_order_confirmation','notify_owner_preview'], modulesUsed:['channelAutomation','ownerCommand'] }),
  rcp({ id:'rcp_payment_pending_reminder', title:'Payment pending → reminder draft → admin review', trigger:'payment.pending',
    actions:['draft_payment_reminder','queue_admin_review'], modulesUsed:['saasBilling','customer360'], riskLevel:'medium' }),
  rcp({ id:'rcp_channel_post_approval', title:'Channel post idea → approval queue → schedule draft', trigger:'content.idea',
    actions:['draft_channel_post','queue_for_approval'], modulesUsed:['channelAutomation','complianceCenter'] }),
  rcp({ id:'rcp_voice_transcript_ticket', title:'Voice transcript → support ticket → reply draft', trigger:'voice.transcript',
    actions:['create_ticket_preview','draft_reply'], modulesUsed:['voiceAI','supportHelpdesk'] }),
  rcp({ id:'rcp_trial_onboarding', title:'Trial requested → onboarding checklist → owner task', trigger:'trial.requested',
    actions:['build_onboarding_checklist','create_owner_task_preview'], modulesUsed:['unifiedSetup','ownerCommand'] }),
  rcp({ id:'rcp_pilot_high_risk', title:'Pilot high-risk → support escalation → follow-up draft', trigger:'pilot.risk_high',
    actions:['escalate_support_preview','draft_followup'], modulesUsed:['ownerCommand','supportHelpdesk'], riskLevel:'high' }),
  rcp({ id:'rcp_reseller_referral', title:'Reseller referral → partner lead preview → commission preview', trigger:'reseller.referral',
    actions:['preview_partner_lead','preview_commission'], modulesUsed:['resellerPortal','kpiCommand'] }),
  rcp({ id:'rcp_price_drop_campaign', title:'Product price drop → campaign draft → KPI preview', trigger:'product.price_drop',
    actions:['draft_campaign','preview_kpi_impact'], modulesUsed:['growthCampaign','kpiCommand'] }),
  rcp({ id:'rcp_ticket_resolved_kb', title:'Support ticket resolved → KB suggestion → feedback request draft', trigger:'ticket.resolved',
    actions:['suggest_kb_article','draft_feedback_request'], modulesUsed:['supportHelpdesk','customer360'] }),
];
function all(){ const s=readJSON(paths.recipes,{}); const custom=Array.isArray(s.recipes)?s.recipes:[];
  const m=new Map(); DEFAULT_RECIPES.forEach(r=>m.set(r.id,r)); custom.forEach(r=>m.set(r.id,r)); return [...m.values()]; }
function get(id){ return all().find(r=>r.id===id)||null; }
function ids(){ return all().map(r=>r.id); }
function upsert(recipe){ const s=readJSON(paths.recipes,{}); s.recipes=Array.isArray(s.recipes)?s.recipes:[];
  const i=s.recipes.findIndex(r=>r.id===recipe.id); const norm=rcp(recipe);
  if(i>=0) s.recipes[i]={...s.recipes[i],...norm}; else s.recipes.push(norm);
  writeJSON(paths.recipes,s); appendHistory(paths.history,{type:'recipe_upsert',id:recipe.id}); return get(recipe.id); }
module.exports={ DEFAULT_RECIPES, all, get, ids, upsert };
