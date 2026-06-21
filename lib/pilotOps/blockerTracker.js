'use strict';

/**
 * Pilot Ops — collect blockers from checklist + pilot record. Read-only.
    */


const checklist = require('./onboardingChecklist');

function forPilot(pilot) {
  const items = checklist.get(pilot && pilot.id);
  const fromChecklist = items.filter(function (it) { return it.status === 'blocked' || (it.required && ['not_started',
'waiting_customer', 'waiting_admin'].indexOf(it.status) !== -1); })
    .map(function (it) { return { source: 'checklist', section: it.section, title: it.title, status: it.status, fixSteps:
it.fixSteps }; });
  const fromPilot = (pilot && Array.isArray(pilot.blockers) ? pilot.blockers : []).map(function (b) { return { source:
'pilot', title: typeof b === 'string' ? b : (b.title || 'blocker') }; });
     return fromChecklist.concat(fromPilot);
}

module.exports = { forPilot };
