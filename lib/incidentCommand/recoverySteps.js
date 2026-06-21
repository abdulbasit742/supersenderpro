'use strict';


/**
 * Incident Command — given an incident, return safe recovery guidance by
 * resolving its runbook. Auto-fix suggestions are ALWAYS dry-run only.
 */


const runbooks = require('./runbooks');
const guard = require('./safetyGuard');


function forIncident(incident) {
  const inc = incident || {};
     const rb = inc.runbookId ? runbooks.get(inc.runbookId) : null;
     const base = {
      incidentId: inc.id || null,

     runbookId: rb ? rb.id : null,
     title: rb ? rb.title : 'No matching runbook',
     severity: rb ? rb.severity : (inc.severity || 'info'),
     symptoms: rb ? rb.symptoms : [],
     likelyCauses: rb ? rb.likelyCauses : [],
     safeChecks: rb ? rb.safeChecks : [],
     manualFixSteps: rb ? rb.manualFixSteps : (inc.recommendedFix ? [inc.recommendedFix] : []),
     dryRunAutoFix: {
       available: rb ? rb.dryRunAutoFixAvailable : false,
     wouldDo: rb && rb.dryRunAutoFixAvailable ? 'Suggested dry-run fix only; nothing is executed.' : 'No auto-fix; manual steps only.',
        executed: false,
     },
     relatedDocs: rb ? rb.relatedDocs : [],
   };
   return guard.safe(base, { autoFixEnabled: guard.allowAutoFix() && false });
}


module.exports = { forIncident };
