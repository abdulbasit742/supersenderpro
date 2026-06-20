// lib/publicSaasFunnel/adapters/customer360Adapter.js
// Safe adapter over existing CRM / Customer 360 modules.
// Allowed: local lead preview, customer profile draft, follow-up task draft.
// NOT allowed by default: write live customer, send live message, expose full PII.

const { config } = require('../store');

let storeCRM = null, kommoCRM = null;
try { storeCRM = require('../../storeCRM'); } catch { storeCRM = null; }
try { kommoCRM = require('../../kommoCRM'); } catch { kommoCRM = null; }

const present = !!(storeCRM || kommoCRM);

// Build a customer profile DRAFT from a (already-masked) lead. Never writes to CRM.
function customerProfileDraft(lead) {
  return {
    type: 'customer_profile_draft',
    crmDetected: present,
    nameSafe: lead && lead.nameSafe || null,
    businessName: lead && lead.businessName || null,
    businessType: lead && lead.businessType || null,
    emailMasked: lead && lead.emailMasked || null,
    phoneMasked: lead && lead.phoneMasked || null,
    interestedModules: (lead && lead.interestedModules) || [],
    source: (lead && lead.sourcePage) || 'public_funnel',
    liveWrite: false,
    note: config.allowCrmWrite && !config.dryRun
      ? 'CRM write flag enabled, but funnel still drafts only — promote via admin tools.'
      : 'DRAFT only — no live customer written, no message sent.',
    createdAt: new Date().toISOString(),
  };
}

function followupTaskDraft(lead, action) {
  return {
    type: 'crm_followup_task_draft',
    leadId: lead && lead.id || null,
    action: action || 'review_and_followup',
    assignTo: 'sales_admin',
    liveWrite: false,
    note: 'DRAFT task only — create in CRM manually after review.',
    createdAt: new Date().toISOString(),
  };
}

module.exports = { present, customerProfileDraft, followupTaskDraft };
