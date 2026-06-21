# v13 Conflict / Duplicate Report

Pilot Ops and existing reseller QA duplicate paths were preserved/skipped where applicable. New isolated modules were written.

## v13_duplicate_blocks.json
```json
[
  "lib/pilotOps/adapters/kpiExportAdapter.js",
  "lib/pilotOps/blockerTracker.js",
  "lib/pilotOps/bugTriage.js",
  "lib/pilotOps/conversionAdvisor.js",
  "lib/pilotOps/followupDrafts.js",
  "lib/pilotOps/store.js",
  "lib/pilotOps/trialManager.js"
]
```

## v13_identical_blocks.json
```json
[
  "artifacts/pilot_ops_inventory.json",
  "artifacts/pilot_ops_smoke.md",
  "docs/PILOT_CONVERSION_PLAYBOOK.md",
  "docs/PILOT_FEEDBACK_TRACKING.md",
  "docs/PILOT_ONBOARDING_CHECKLIST.md",
  "docs/PILOT_OPS_ADMIN_COMMANDS.md",
  "docs/PILOT_OPS_COMMAND_CENTER.md",
  "docs/PILOT_OPS_GAP_REPORT.md",
  "docs/PILOT_SUCCESS_SCORING.md",
  "lib/pilotOps/adapters/_base.js",
  "lib/pilotOps/adapters/businessSetupAdapter.js",
  "lib/pilotOps/adapters/complianceAdapter.js",
  "lib/pilotOps/adapters/customer360Adapter.js",
  "lib/pilotOps/adapters/demoSandboxAdapter.js",
  "lib/pilotOps/adapters/incidentCommandAdapter.js",
  "lib/pilotOps/adapters/kpiCommandAdapter.js",
  "lib/pilotOps/adapters/ownerCommandAdapter.js",
  "lib/pilotOps/adapters/ownerCommandSummary.js",
  "lib/pilotOps/adapters/publicFunnelAdapter.js",
  "lib/pilotOps/adapters/saasBillingAdapter.js",
  "lib/pilotOps/adapters/tenantPortalAdapter.js",
  "lib/pilotOps/adminCommands.js",
  "lib/pilotOps/feedbackClassifier.js",
  "lib/pilotOps/feedbackStore.js",
  "lib/pilotOps/messageTemplates.js",
  "lib/pilotOps/onboardingChecklist.js",
  "lib/pilotOps/pilotRegistry.js",
  "lib/pilotOps/privacyGuard.js",
  "lib/pilotOps/riskScoring.js",
  "lib/pilotOps/safetyGuard.js",
  "lib/pilotOps/setupProgress.js",
  "lib/pilotOps/successScoring.js",
  "public/css/funnel.css",
  "public/css/pilot-ops.css",
  "public/features.html",
  "public/js/funnel.js",
  "public/js/pilot-ops.js",
  "public/landing.html",
  "public/pilot-ops.html",
  "public/pricing.html",
  "routes/pilotOpsRoutes.js",
  "scripts/pilot-ops-check.js",
  "tests/smoke/pilotOpsSmoke.js"
]
```

## v13_conflicts_overwritten.json
```json
[
  "public/start.html",
  "tests/smoke/pilotOpsSmoke.js"
]
```