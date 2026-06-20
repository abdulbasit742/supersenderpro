// lib/unifiedSetup/autopilotPlanner.js — Generates a recommended setup plan from the business
// type preset, annotated with the current status of each recommended step.

const presets = require('./presets');
const stepEngine = require('./stepEngine');
const recommendationEngine = require('./recommendationEngine');
const { config } = require('./store');

function plan(businessType = 'custom') {
  const preset = presets.get(businessType);
  const steps = stepEngine.allSteps();
  const byId = Object.fromEntries(steps.map((s) => [s.id, s]));

  const recommended = preset.recommended.map((id, i) => {
    const s = byId[id] || { id, title: id, status: 'not_started' };
    return {
      order: i + 1,
      id,
      title: s.title || id,
      status: s.status,
      required: !!s.required,
      optional: preset.optional.includes(id),
      docsLink: s.docsLink || null,
    };
  });

  return {
    businessType,
    label: preset.label,
    dryRun: config.dryRun,
    autopilotEnabled: config.autopilotEnabled,
    recommendedPath: recommended,
    optionalModules: preset.optional,
    topNextSteps: recommendationEngine.topNextSteps(6),
  };
}

module.exports = { plan };
