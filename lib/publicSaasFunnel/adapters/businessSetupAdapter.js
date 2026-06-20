// lib/publicSaasFunnel/adapters/businessSetupAdapter.js
// Safe adapter over the existing Unified Setup Wizard / Business Setup.
// Generates preset previews + readiness checklists. Never modifies live setup.

let unified = null;
try { unified = require('../../unifiedSetup'); } catch { unified = null; }

const present = !!unified;

// Generate a setup preview for an industry/business type (preview only).
function setupPreview(businessType, goal) {
  const safeType = String(businessType || 'custom');
  let preset = null;
  let recommendedModules = [];
  let checklist = [];

  if (present) {
    try {
      if (unified.presets && typeof unified.presets.get === 'function') {
        preset = unified.presets.get(safeType) || null;
      }
    } catch { preset = null; }
    try {
      if (unified.recommendationEngine && typeof unified.recommendationEngine.topNextSteps === 'function') {
        recommendedModules = unified.recommendationEngine.topNextSteps({ businessType: safeType, goal }) || [];
      }
    } catch { recommendedModules = []; }
    try {
      if (unified.credentialChecklist && typeof unified.credentialChecklist.build === 'function') {
        checklist = unified.credentialChecklist.build(safeType) || [];
      }
    } catch { checklist = []; }
  }

  // Fallback content when wizard not available or returned nothing.
  if (!preset) {
    preset = {
      businessType: safeType,
      recommendedModules: defaultModulesFor(safeType),
      note: 'Fallback preset preview (Business Setup Wizard not available).',
    };
  }
  if (!recommendedModules || recommendedModules.length === 0) {
    recommendedModules = (preset.recommendedModules || defaultModulesFor(safeType));
  }
  if (!checklist || checklist.length === 0) {
    checklist = defaultChecklist();
  }

  return {
    type: 'business_setup_preview',
    source: present ? 'unified_setup_wizard' : 'fallback',
    businessType: safeType,
    goal: goal || null,
    preset,
    recommendedModules,
    recommendedPlaybooks: defaultPlaybooks(safeType),
    recommendedAgents: ['lead_followup_agent', 'support_reply_agent'],
    readinessChecklist: checklist,
    liveSetupModified: false,
    note: 'PREVIEW only — no live tenant or setup was modified.',
    createdAt: new Date().toISOString(),
  };
}

function defaultModulesFor(type) {
  const map = {
    ecommerce: ['ecommerce_automation', 'customer_360', 'whatsapp_crm'],
    agency: ['owner_command', 'kpi_analytics', 'playbooks'],
    real_estate: ['whatsapp_crm', 'customer_360', 'voice_ai'],
    restaurant: ['whatsapp_crm', 'ecommerce_automation'],
    ai_tools_reseller: ['saas_billing', 'whatsapp_crm', 'ai_agents'],
  };
  return map[type] || ['whatsapp_crm', 'customer_360', 'owner_command'];
}
function defaultPlaybooks(type) {
  return ['new_lead_followup', 'daily_owner_briefing', `${type}_onboarding`];
}
function defaultChecklist() {
  return [
    { item: 'Connect WhatsApp number', status: 'pending', required: true },
    { item: 'Choose industry preset', status: 'pending', required: true },
    { item: 'Set consent & opt-out policy', status: 'pending', required: true },
    { item: 'Pick starting modules', status: 'pending', required: false },
    { item: 'Review plan & trial', status: 'pending', required: false },
  ];
}

module.exports = { present, setupPreview };
