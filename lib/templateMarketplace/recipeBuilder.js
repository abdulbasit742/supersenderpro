// lib/templateMarketplace/recipeBuilder.js — Normalises/builds a recipe object (preview, no execution).
'use strict';
const now=()=>new Date().toISOString();
function build(input={}){
  return { id: input.id || `rcp_${Date.now()}`, title: input.title || 'Untitled Recipe',
    trigger: input.trigger || 'manual', conditions: Array.isArray(input.conditions)?input.conditions:[],
    actions: Array.isArray(input.actions)?input.actions:[], modulesUsed: input.modulesUsed||[],
    approvalRequired: input.approvalRequired!==false, dryRun:true, riskLevel: input.riskLevel||'low',
    complianceNotes: input.complianceNotes||'Draft-only; no live actions by default.',
    sampleInput: input.sampleInput||{}, sampleOutput: input.sampleOutput||{}, createdAt: now() };
}
module.exports={ build };
