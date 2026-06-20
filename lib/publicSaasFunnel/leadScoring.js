// lib/publicSaasFunnel/leadScoring.js
// Funnel-specific lead scoring. (Separate from lib/leadScoring.js which scores WhatsApp bot leads.)
// Returns { score, grade, reasons, nextAction }.

const HIGH_VALUE_TYPES = ['ai_tools_reseller', 'digital_agency', 'agency', 'ecommerce', 'wholesale', 'real_estate'];
const HIGH_VALUE_PLANS = ['agency', 'reseller', 'enterprise', 'pro', 'lifetime', 'custom'];
const URGENCY_WORDS = ['asap', 'urgent', 'today', 'now', 'immediately', 'jaldi', 'abhi', 'turant'];

function score(lead = {}, signals = {}) {
  let s = 0;
  const reasons = [];

  const type = String(lead.businessType || '').toLowerCase();
  if (HIGH_VALUE_TYPES.some((t) => type.includes(t))) { s += 15; reasons.push('high_value_industry'); }
  else if (type) { s += 5; reasons.push('business_type_fit'); }

  const mods = Array.isArray(lead.interestedModules) ? lead.interestedModules.length : 0;
  if (mods >= 3) { s += 12; reasons.push('multiple_modules_interest'); }
  else if (mods >= 1) { s += 6; reasons.push('module_interest'); }

  const plan = String(lead.interestedPlan || '').toLowerCase();
  if (HIGH_VALUE_PLANS.some((p) => plan.includes(p))) { s += 18; reasons.push('high_value_plan'); }
  else if (plan) { s += 7; reasons.push('plan_selected'); }

  const msg = String(lead.messagePreview || '').toLowerCase();
  if (URGENCY_WORDS.some((w) => msg.includes(w))) { s += 10; reasons.push('urgency_keywords'); }

  if (signals.demoRequested) { s += 20; reasons.push('demo_requested'); }
  if (signals.trialRequested) { s += 18; reasons.push('trial_requested'); }
  if (signals.resellerInquiry || type.includes('reseller') || type.includes('agency')) { s += 8; reasons.push('reseller_agency_interest'); }

  if (lead.consentContact) { s += 5; reasons.push('consent_provided'); }
  else { reasons.push('no_contact_consent'); }

  s = Math.max(0, Math.min(100, s));

  let grade = 'cold';
  if (s >= 70) grade = 'priority';
  else if (s >= 50) grade = 'hot';
  else if (s >= 25) grade = 'warm';

  let nextAction;
  if (!lead.consentContact) nextAction = 'await_consent_admin_review_only';
  else if (grade === 'priority') nextAction = 'sales_call_within_24h_draft';
  else if (grade === 'hot') nextAction = 'send_followup_draft_soon';
  else if (grade === 'warm') nextAction = 'nurture_followup_draft';
  else nextAction = 'add_to_nurture_list';

  return { score: s, grade, reasons, nextAction };
}

module.exports = { score };
