// lib/unifiedSetup/readinessReport.js — Unified launch readiness report.
// Combines step statuses, credential checklist, and security/config signals into one score.
// Pure read; never modifies modules or calls external services.

const stepEngine = require('./stepEngine');
const credentialChecklist = require('./credentialChecklist');
const scoring = require('./readinessScoring');
const connectors = require('./connectors');
const { config } = require('./store');

function build() {
  const steps = stepEngine.allSteps();
  const checklist = credentialChecklist.build();
  const credSummary = credentialChecklist.summary();

  const configScore = scoring.scoreSteps(steps);
  const credentialsScore = scoring.scoreCredentials(checklist);

  // Security score: based on security-category steps + JWT secret presence.
  const securitySteps = steps.filter((s) => s.category === 'security');
  const securityScore = scoring.scoreSteps(securitySteps);

  // Module readiness: % of module-backed steps whose code is present.
  const moduleStatuses = connectors.allStatuses();
  const codePresent = moduleStatuses.filter((m) => m.codePresent).length;
  const moduleReadiness = moduleStatuses.length ? Math.round((codePresent / moduleStatuses.length) * 100) : 0;

  // Dry-run readiness: everything safe to run in dry-run = code present for required steps.
  const requiredSteps = steps.filter((s) => s.required);
  const requiredReady = requiredSteps.filter((s) => ['configured', 'verified', 'partially_configured'].includes(s.status)).length;
  const dryRunReadiness = requiredSteps.length ? Math.round((requiredReady / requiredSteps.length) * 100) : 100;

  const blockers = [];
  steps.forEach((s) => { if (s.required && ['missing_config', 'blocked', 'not_started'].includes(s.status)) {
    blockers.push(`${s.title}: ${s.nextAction}`);
  }});
  credSummary.requiredMissing.forEach((n) => blockers.push(`Missing required credential: ${n}`));

  const warnings = [];
  steps.forEach((s) => { (s.warnings || []).forEach((wm) => warnings.push(`${s.title}: ${wm}`)); });

  // Composite score (weighted)
  const score = Math.round(
    configScore * 0.35 + credentialsScore * 0.2 + securityScore * 0.25 + moduleReadiness * 0.2
  );

  const readyForLocalPilot = dryRunReadiness >= 80 && securityScore >= 50;
  const readyForCloudPilot = readyForLocalPilot && credentialsScore >= 50 && blockers.length === 0;
  const readyForProduction = readyForCloudPilot && score >= 85 && credSummary.requiredMissing.length === 0;

  let status = 'setup_needed';
  if (blockers.length && securityScore < 50) status = 'blocked';
  else if (readyForProduction) status = 'production_ready_with_credentials';
  else if (readyForCloudPilot) status = 'pilot_ready';
  else if (readyForLocalPilot) status = 'dry_run_ready';

  const nextSteps = require('./recommendationEngine').topNextSteps(5);

  return {
    generatedAt: new Date().toISOString(),
    dryRun: config.dryRun,
    score,
    status,
    scores: { configScore, credentialsScore, securityScore, moduleReadiness, dryRunReadiness },
    blockers,
    warnings: warnings.slice(0, 20),
    nextSteps,
    readyForLocalPilot,
    readyForCloudPilot,
    readyForProduction,
    credentials: credSummary,
  };
}

module.exports = { build };
