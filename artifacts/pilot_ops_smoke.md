6) WhatsApp admin commands (integration point only)
Wire into your EXISTING admin command router. Do NOT create a new bot.


 // BEGIN PILOT OPS HOOK
 const pilotAdmin = require('./lib/pilotOps/adminCommands');
 // inside your existing inbound admin-text handler:
 if (pilotAdmin.isPilotCommand(text)) {
   const out = pilotAdmin.handle(text); // { ok, dryRun, message }
   return reply(out.message);
 }
 // END PILOT OPS HOOK




Validation (run locally, do not fake)
 node --check routes/pilotOpsRoutes.js
 node --check lib/pilotOps/safetyGuard.js
 node --check lib/pilotOps/privacyGuard.js
 node --check lib/pilotOps/store.js
 node --check lib/pilotOps/pilotRegistry.js
 node --check lib/pilotOps/trialManager.js
 node --check lib/pilotOps/onboardingChecklist.js
 node --check lib/pilotOps/setupProgress.js
 node --check lib/pilotOps/blockerTracker.js
 node --check lib/pilotOps/successScoring.js
 node --check lib/pilotOps/riskScoring.js
 node --check lib/pilotOps/conversionAdvisor.js
 node --check lib/pilotOps/feedbackStore.js
 node --check lib/pilotOps/feedbackClassifier.js
 node --check lib/pilotOps/bugTriage.js
 node --check lib/pilotOps/followupDrafts.js

  node --check lib/pilotOps/messageTemplates.js
  node --check lib/pilotOps/adminCommands.js
  node --check scripts/pilot-ops-check.js
  node --check tests/smoke/pilotOpsSmoke.js
  npm run pilot-ops:check
  npm run pilot-ops:smoke



Note: depends only on express (already in your stack) + Node built-ins ( fs , path , crypto ). No new
dependencies. All adapters degrade to unavailable when a target module is absent. The follow-up generator
reuses the Compliance adapter when present, else falls back to the pilot's own consent flag.
