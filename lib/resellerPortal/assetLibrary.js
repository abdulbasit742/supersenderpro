'use strict';
/** Partner asset library: generates draft assets. Drafts only, no live send, consent-safe note. */
const salesScripts = require('./salesScripts');
const demoScripts = require('./demoScripts');
const ASSET_TYPES = ['sales_pitch', 'whatsapp_intro', 'demo_invitation', 'pricing_explanation', 'feature_comparison', 'onboarding_checklist', 'funnel_link_template', 'demo_tour_link', 'preset_explanation', 'objection_handling', 'upgrade_pitch', 'reseller_faq'];
function generate(type, language) {
  const lang = language || 'roman_urdu';
  const draft = (() => {
    switch (type) {
      case 'sales_pitch': return salesScripts.get('pitch', lang);
      case 'whatsapp_intro': return salesScripts.get('whatsapp_intro', lang);
      case 'pricing_explanation': return salesScripts.get('pricing', lang);
      case 'objection_handling': return salesScripts.get('objection', lang);
      case 'upgrade_pitch': return salesScripts.get('upgrade', lang);
      case 'demo_invitation': return demoScripts.get(lang).invite;
      case 'feature_comparison': return 'SuperSender Pro vs others: official + unofficial WhatsApp, consent compliance, demo sandbox, white-label. (draft)';
      case 'onboarding_checklist': return 'Onboarding: connect WhatsApp, pick preset, complete setup checklist, run readiness. (draft)';
      case 'funnel_link_template': return '/partners.html?ref=YOUR_CODE (draft, no PII)';
      case 'demo_tour_link': return '/demo-sandbox.html#tours (draft)';
      case 'preset_explanation': return 'Industry presets pre-configure modules, playbooks, and agents for your client type. (draft)';
      case 'reseller_faq': return 'Q: Do I get recurring commission? A: Yes, preview your estimate in the portal. (draft)';
      default: return salesScripts.get('pitch', lang);
    }
  })();
  return { type: ASSET_TYPES.includes(type) ? type : 'sales_pitch', language: lang, draft, dryRun: true, note: 'Draft only. No live sending. Always communicate consent-safe (include opt-out).' };
}
function list() { return ASSET_TYPES; }
module.exports = { ASSET_TYPES, generate, list };
