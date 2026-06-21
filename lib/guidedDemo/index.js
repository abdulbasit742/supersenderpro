   'use strict';
   /**
    * lib/guidedDemo/index.js
    * Facade for the Guided Demo Journey center. Composes registry + step runner +
    * acceptance checklist + readiness + report. Reuses Demo Sandbox / Demo Mode when present.
    */
   const safety = require('./demoSafety');
   const registry = require('./demoJourneyRegistry');
   const stepRunner = require('./demoStepRunner');
   const checklist = require('./demoAcceptanceChecklist');
   const readiness = require('./demoReadinessScoring');
   const report = require('./demoReportBuilder');

   function status() {
     return { enabled: String(process.env.GUIDED_DEMO_ENABLED || 'true') === 'true', safety: safety.panel(), journeys:
   registry.list().length };
   }
   module.exports = { status, registry, stepRunner, checklist, readiness, report, safety };
