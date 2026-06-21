  const registry = require('./presetRegistry');
  const profileManager = require('./profileManager');
  const checklist = require('./setupChecklist');
  const readiness = require('./readinessScoring');
  const safety = require('./safetyGuard');

const store = require('./store');

const ENV_CHECKLIST = [
    'BUSINESS_SETUP_ENABLED', 'BUSINESS_SETUP_DRY_RUN', 'BUSINESS_SETUP_REQUIRE_APPROVAL',
];

function apply(params) {
    const p = params || {};
    const preset = registry.get(p.presetId) || registry.forBusinessType(p.businessType);
    if (!preset) return { dryRun: true, blockers: ['unknown_preset'], warnings: [], nextSteps: ['choose a valid preset'] };

    // 1. create/update local profile (dry-run, masked)
    const profileInput = Object.assign({}, p.profile, { businessType: p.businessType || (p.profile &&
p.profile.businessType), selectedPreset: preset.id });
 const profRes = profileManager.get() ? profileManager.update(profileInput) : profileManager.create(profileInput);
    const createdProfile = profRes.profile || null;

    // 2. recommendations
    const rec = registry.recommendationsFor(preset.id);


    // 3. checklist
    const items = checklist.generate(preset.id);


    // 4. env + launch checklists
    const envChecklist = ENV_CHECKLIST.map((name) => ({ name, present: !!process.env[name] }));
    const launchChecklist = (preset.launchBlockers || []).map((s) => ({ section: s, mustClearBeforeLaunch: true }));


    // 5. readiness snapshot
    const score = readiness.run();


    const guard = safety.check('persist_preset');
    const warnings = [].concat(guard.warnings);
    if (!safety.allowPresetWrite()) warnings.push('preset not persisted to live config (BUSINESS_SETUP_ALLOW_PRESET_WRITE=false)');

    const result = {
      dryRun: true,
      presetId: preset.id,
      createdProfile: store.maskDeep(createdProfile),
      recommendedModules: rec.modules,
      recommendedPlaybooks: rec.playbooks,
      recommendedAgents: rec.agents,
      recommendedFlows: rec.flows,
      checklist: items,
      envChecklist,
      launchChecklist,
      readiness: score,
      blockers: score.blockers,
      warnings,
      nextSteps: [
        'Review recommended modules and enable manually when ready',
         'Work through required checklist items',
         'Run readiness check until pilot_ready',
      ],
    };
    store.appendHistory({ kind: 'preset_applied', presetId: preset.id, score: score.score });
    return result;

}


module.exports = { apply, ENV_CHECKLIST };
