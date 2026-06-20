// lib/templateMarketplace/templateDraftGenerator.js — Safe draft generator (rule-based fallback by default).
// No external AI call unless TEMPLATE_MARKETPLACE_AI_LIVE=true and AI settings allow it.
'use strict';
const prompts=require('./templatePrompts');
const { flags }=require('./safetyGuard');
const now=()=>new Date().toISOString();
function aiLive(){ return flags.aiLive===true; }

function templateDraft(input={}){
  const industry=input.industry||'General Business';
  return { kind:'template', aiUsed:false, mode:aiLive()?'ai_ready':'rule_based', prompt:prompts.template(industry),
    draft:{ title:`${industry} Starter (Draft)`, category:'industry_blueprint', industry, dryRun:true,
      description:`Auto-drafted blueprint for ${industry}. Review before activating.`,
      modulesUsed:input.modulesUsed||['unifiedSetup','channelAutomation','customer360'],
      includedRecipes:['rcp_new_lead_followup'], includedOwnerTasks:['Review setup','Approve content'] },
    generatedAt:now() };
}
function recipeDraft(input={}){
  const goal=input.goal||'follow up new leads';
  return { kind:'recipe', aiUsed:false, mode:aiLive()?'ai_ready':'rule_based', prompt:prompts.recipe(goal),
    draft:{ id:`rcp_${Date.now()}`, title:`Recipe: ${goal}`, trigger:input.trigger||'manual',
      actions:['preview_customer_360','draft_followup_message'], approvalRequired:true, dryRun:true, riskLevel:'low' }, generatedAt:now() };
}
function playbookDraft(input={}){
  const topic=input.topic||'onboarding';
  return { kind:'playbook', aiUsed:false, mode:aiLive()?'ai_ready':'rule_based', prompt:prompts.playbook(topic),
    draft:{ title:`Playbook: ${topic}`, steps:[{step:1,title:'Define goal'},{step:2,title:'Assign owner'},{step:3,title:'Review checkpoint'}] }, generatedAt:now() };
}
module.exports={ templateDraft, recipeDraft, playbookDraft, aiLive };
