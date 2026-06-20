// lib/whatsappCloudSetup/setupWizard.js — Orchestrates the WhatsApp Cloud onboarding wizard (read/preview only).
'use strict';

const store = require('./store');
const checklist = require('./setupChecklist');
const validator = require('./setupValidator');
const { computeReadiness } = require('./readinessScoring');
const { safetyPanel, flags } = require('./safety');
const { redactPII } = require('./redactor');

function getStatus() {
  return {
    ok: true,
    enabled: flags.enabled,
    dryRun: flags.dryRun,
    liveSend: flags.liveSend,
    config: store.getConfig(),
    checklist: checklist.summary(),
    safety: safetyPanel(),
  };
}

function getChecklist() {
  return { ok: true, checklist: checklist.getChecklist(), summary: checklist.summary() };
}

function updateChecklist(key, done) {
  return checklist.updateItem(key, done);
}

// Validate then (only if valid) persist a masked config draft.
function applyConfig(input = {}) {
  const result = validator.validateConfig(input);
  if (!result.ok) return { ok: false, errors: result.errors, warnings: result.warnings };
  const saved = store.saveConfig(input);
  return { ok: true, config: redactPII(saved), warnings: result.warnings };
}

function getReadiness(templates = []) {
  const config = store.getConfig();
  const list = checklist.getChecklist();
  return { ok: true, readiness: computeReadiness(config, list, templates) };
}

module.exports = { getStatus, getChecklist, updateChecklist, applyConfig, getReadiness };
