6) WhatsApp admin commands (integration point only)
Wire into your EXISTING admin command router. Do NOT create a new bot.


  // BEGIN INCIDENT COMMAND HOOK
  const incidentAdmin = require('./lib/incidentCommand/adminCommands');
  // inside your existing inbound admin-text handler, before other routing:
  if (incidentAdmin.isIncidentCommand(text)) {
    const out = incidentAdmin.handle(text); // { ok, dryRun, message }
    return reply(out.message); // use your existing reply() / sender
  }
  // END INCIDENT COMMAND HOOK




Validation (run locally, do not fake)
  node --check routes/incidentCommandRoutes.js
  node --check lib/incidentCommand/store.js
  node --check lib/incidentCommand/safetyGuard.js
  node --check lib/incidentCommand/severityEngine.js
  node --check lib/incidentCommand/incidentStore.js
  node --check lib/incidentCommand/moduleRegistry.js
  node --check lib/incidentCommand/healthAggregator.js
  node --check lib/incidentCommand/incidentDetector.js
  node --check lib/incidentCommand/rules.js
  node --check lib/incidentCommand/runbooks.js
  node --check lib/incidentCommand/recoverySteps.js

  node --check lib/incidentCommand/alertRules.js
  node --check lib/incidentCommand/alertFormatter.js
  node --check lib/incidentCommand/adminCommands.js
  node --check lib/incidentCommand/adapters/_base.js
  node --check scripts/incident-command-check.js
  node --check tests/smoke/incidentCommandSmoke.js
  npm run incident-command:check
  npm run incident-command:smoke



Note: depends only on express (already in your stack) + Node built-ins ( fs , path , crypto ). No new
dependencies. All adapters degrade gracefully when a module is absent.
