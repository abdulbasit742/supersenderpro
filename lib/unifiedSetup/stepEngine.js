// lib/unifiedSetup/stepEngine.js — Computes the status of every onboarding step by combining
// step definitions, module connectors, and any user-set verification overrides.
// Pure read/inspect: never modifies live modules.

const definitions = require('./stepDefinitions');
const connectors = require('./connectors');
const { config, readJSON, writeJSON, appendHistory } = require('./store');

const STATUSES = ['not_started', 'configured', 'partially_configured', 'missing_config', 'blocked', 'skipped', 'verified'];

function _overrides() {
  const d = readJSON(config.paths.store, {});
  return d.stepOverrides || {};
}
function _saveOverride(id, patch) {
  const d = readJSON(config.paths.store, {});
  d.stepOverrides = d.stepOverrides || {};
  d.stepOverrides[id] = { ...(d.stepOverrides[id] || {}), ...patch, updatedAt: new Date().toISOString() };
  writeJSON(config.paths.store, d);
  return d.stepOverrides[id];
}

function buildStep(def, overrides) {
  const ov = overrides[def.id] || {};
  let status = 'not_started';
  const blockers = [];
  const warnings = [];
  let missingEnv = [];
  let docsLink = null;
  let routeLink = null;
  let needsCredential = false;
  let needsManualAction = false;
  let dryRunSafe = true;

  if (def.connectorId) {
    const c = connectors.byId(def.connectorId);
    if (c) {
      status = c.status;
      blockers.push(...c.blockers);
      warnings.push(...c.warnings);
      missingEnv = c.missingEnv;
      docsLink = c.docsLink;
      routeLink = c.routeLink;
      needsCredential = c.needsCredential;
      needsManualAction = c.needsManualAction;
      dryRunSafe = c.dryRunSafe;
    }
  } else {
    // Pure-config step: starts not_started unless verified/skipped by user.
    status = 'not_started';
    docsLink = 'docs/UNIFIED_SETUP_WIZARD.md';
  }

  // Apply user overrides (verify / skip)
  if (ov.status && STATUSES.includes(ov.status)) status = ov.status;

  // Required + blocked logic
  if (def.required && (status === 'missing_config' || status === 'not_started')) {
    if (def.id === 'pilot_launch') {
      // pilot launch is gated by everything else; not itself a blocker source here
    }
  }

  const nextAction = {
    not_started: 'Start configuration',
    missing_config: 'Add required credentials',
    partially_configured: 'Complete remaining credentials',
    blocked: 'Resolve blockers',
    configured: 'Verify this step',
    verified: 'Done',
    skipped: 'Skipped',
  }[status] || 'Review';

  return {
    id: def.id,
    title: def.title,
    category: def.category,
    status,
    required: !!def.required,
    blockers,
    warnings,
    missingEnv,
    docsLink: ov.docsLink || docsLink,
    routeLink,
    nextAction,
    dryRunSafe,
    needsCredential,
    needsManualAction,
  };
}

function allSteps() {
  const overrides = _overrides();
  return definitions.map((d) => buildStep(d, overrides));
}

function getStep(id) {
  const def = definitions.find((d) => d.id === id);
  if (!def) return null;
  return buildStep(def, _overrides());
}

// Verify is a local/dry-run confirmation; it does not call external services.
function verifyStep(id, note = '') {
  const def = definitions.find((d) => d.id === id);
  if (!def) return null;
  const cur = getStep(id);
  // Only allow marking verified if not blocked by missing required credentials.
  const newStatus = cur.needsCredential && def.required ? 'missing_config' : 'verified';
  _saveOverride(id, { status: newStatus, note });
  appendHistory('step_verified', { id, status: newStatus });
  return getStep(id);
}

function skipStep(id) {
  if (!definitions.find((d) => d.id === id)) return null;
  _saveOverride(id, { status: 'skipped' });
  appendHistory('step_skipped', { id });
  return getStep(id);
}

module.exports = { allSteps, getStep, verifyStep, skipStep, STATUSES };
