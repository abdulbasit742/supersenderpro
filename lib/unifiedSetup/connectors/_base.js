// lib/unifiedSetup/connectors/_base.js — Shared, crash-proof inspector for existing modules.
// A connector NEVER imports/runs a module; it only checks for the presence of code files,
// routes, pages, and env var NAMES. It never exposes secret values.

const { repoHas } = require('../store');

function envSet(name) {
  const v = process.env[name];
  return !!(v && String(v).trim());
}

function inspect(spec = {}) {
  const libs = spec.libs || [];
  const routes = spec.routes || [];
  const pages = spec.pages || [];
  const envRequired = spec.envRequired || [];
  const envOptional = spec.envOptional || [];

  const codePresent = [...libs, ...routes, ...pages].some((p) => repoHas(p));
  const presentRoutes = routes.filter(repoHas);
  const presentPages = pages.filter(repoHas);

  const missingEnv = envRequired.filter((n) => !envSet(n));
  const setEnv = envRequired.filter(envSet);

  let status = 'not_started';
  const blockers = [];
  const warnings = [];

  if (!codePresent) {
    status = 'not_started';
    warnings.push(`${spec.label || spec.id} module code not found in this build.`);
  } else if (envRequired.length === 0) {
    status = 'configured';
  } else if (missingEnv.length === 0) {
    status = 'configured';
  } else if (setEnv.length > 0) {
    status = 'partially_configured';
    warnings.push(`Missing env: ${missingEnv.join(', ')}`);
  } else {
    status = 'missing_config';
    if (spec.requiredForLaunch) blockers.push(`${spec.label || spec.id} needs credentials: ${missingEnv.join(', ')}`);
    else warnings.push(`Needs credentials: ${missingEnv.join(', ')}`);
  }

  return {
    id: spec.id,
    label: spec.label || spec.id,
    category: spec.category || 'general',
    status,
    codePresent,
    routeAvailable: presentRoutes.length > 0,
    pageAvailable: presentPages.length > 0,
    missingEnv,
    optionalEnv: envOptional,
    blockers,
    warnings,
    docsLink: spec.docsLink || null,
    routeLink: spec.routeLink || null,
    dryRunSafe: spec.dryRunSafe !== false,
    needsCredential: missingEnv.length > 0,
    needsManualAction: !!spec.needsManualAction,
    liveActionRisk: !!spec.liveActionRisk,
  };
}

module.exports = { inspect, envSet };
