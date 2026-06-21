'use strict';


/**
 * Pilot Ops — derive setup progress from a pilot's checklist. */ const checklist = require('./onboardingChecklist'); function summarize(pilotId) { const items = checklist.get(pilotId); if (!items.length) return { total: 0, completed: 0, required: 0, requiredCompleted: 0, percent: 0, blocked: 0, bySection: {} }; let completed = 0, required = 0, requiredCompleted = 0, blocked = 0; const bySection = {}; items.forEach(function (it) {
       bySection[it.section] = it.status;
         if (it.status === 'completed') completed++;
         if (it.status === 'blocked') blocked++;
       if (it.required) { required++; if (it.status === 'completed') requiredCompleted++; }
     });
     const percent = Math.round((completed / items.length) * 100);
     return { total: items.length, completed: completed, required: required, requiredCompleted: requiredCompleted, percent:
percent, blocked: blocked, bySection: bySection };

}


module.exports = { summarize };
