'use strict';


/**
    * Reseller Portal QA — readiness score from the onboarding checklist. Pure function.
    */


const checklist = require('./partnerOnboardingChecklist');

function score(items) {
    const list = Array.isArray(items) ? items : checklist.build();
    let total = 0, done = 0, requiredTotal = 0, requiredDone = 0, blocked = 0, warnings = 0;
    list.forEach(function (it) {
      total++;
      const ok = it.status === 'configured' || it.status === 'verified';
      if (ok) done++;
      if (it.status === 'blocked') blocked++;
      if (it.status === 'warning') warnings++;
      if (it.required) { requiredTotal++; if (ok) requiredDone++; }
    });
    const percent = total ? Math.round((done / total) * 100) : 0;
    const requiredPercent = requiredTotal ? Math.round((requiredDone / requiredTotal) * 100) : 0;
    return { score: percent, requiredPercent: requiredPercent, total: total, done: done, blocked: blocked, warnings:

warnings, requiredTotal: requiredTotal, requiredDone: requiredDone };
}

module.exports = { score };
