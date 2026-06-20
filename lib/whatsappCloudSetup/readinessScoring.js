// lib/whatsappCloudSetup/readinessScoring.js — Computes a readiness score + status from config + checklist + templates.
'use strict';

const STATUSES = ['blocked', 'local_ready', 'setup_ready', 'webhook_ready', 'template_ready', 'production_preview_ready'];

// config: config model object; checklist: array from setupChecklist; templates: optional array of template objects.
function computeReadiness(config = {}, checklist = [], templates = []) {
  const blockers = [];
  const warnings = [];
  const nextSteps = [];

  const done = (key) => {
    const item = checklist.find((c) => c.key === key);
    return !!(item && item.done);
  };

  // Score = % of checklist done (capped contributions per stage).
  const total = checklist.length || 1;
  const completed = checklist.filter((c) => c.done).length;
  const score = Math.round((completed / total) * 100);

  // Blockers / next steps per stage.
  if (!config.businessName) nextSteps.push('Set your business display name');
  if (!done('meta_app_created')) { blockers.push('Meta app not created'); nextSteps.push('Create a Meta app in developers.facebook.com'); }
  if (!done('waba_connected')) { blockers.push('WhatsApp Business Account not connected'); }
  if (!done('phone_number_id_added')) { blockers.push('Phone number ID not added'); }

  if (!config.accessTokenConfigured) {
    warnings.push('Access token not detected in .env (WHATSAPP_CLOUD_ACCESS_TOKEN)');
    nextSteps.push('Add the permanent token to .env only — never store it here');
  }
  if (!config.verifyTokenConfigured) {
    warnings.push('Verify token not detected in .env (WHATSAPP_CLOUD_VERIFY_TOKEN)');
  }

  const approvedTemplates = (templates || []).filter((t) => t.status === 'approved').length;
  const draftTemplates = (templates || []).length;
  if (draftTemplates === 0) nextSteps.push('Create your first template in the Template Manager');

  // Determine status by progression.
  let status = 'blocked';
  const setupReady = done('meta_app_created') && done('waba_connected') && done('phone_number_id_added');
  const webhookReady = setupReady && done('webhook_url_configured') && done('verify_token_configured');
  const templateReady = webhookReady && (approvedTemplates > 0 || done('first_template_created'));
  const productionPreview = templateReady && done('test_send_preview_ready') && done('production_risk_notes_reviewed');

  if (productionPreview) status = 'production_preview_ready';
  else if (templateReady) status = 'template_ready';
  else if (webhookReady) status = 'webhook_ready';
  else if (setupReady) status = 'setup_ready';
  else if (config.businessName || draftTemplates > 0) status = 'local_ready';
  else status = 'blocked';

  if (nextSteps.length === 0) nextSteps.push('All core steps complete — review production risk notes before going live');

  return {
    score,
    status,
    statuses: STATUSES,
    blockers,
    warnings,
    nextSteps,
    counts: { checklistDone: completed, checklistTotal: total, templates: draftTemplates, approvedTemplates },
    dryRun: true,
  };
}

module.exports = { computeReadiness, STATUSES };
