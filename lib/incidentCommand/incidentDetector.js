'use strict';

/**
    * Incident Command — runs detection rules + folds in adapter health, producing
    * candidate incidents. Read-only. Never executes fixes. Never throws.
    */


const { RULES } = require('./rules');
const healthAggregator = require('./healthAggregator');
const sev = require('./severityEngine');
const guard = require('./safetyGuard');

function fromRules() {
     const out = [];
     RULES.forEach(function (rule) {
         let hit = false;
         try { hit = !!rule.test(); } catch (e) { hit = false; }
         if (hit) {
           out.push(guard.redact({
             source: 'rule', ruleId: rule.id,
             moduleId: rule.category, moduleName: rule.category,
        status: 'warning', severity: sev.normalizeSeverity(rule.severity), category:
sev.normalizeCategory(rule.category),
             summary: rule.summary, recommendedFix: rule.recommendedFix, runbookId: rule.runbookId,
           }));
       }
     });
     return out;
}

function fromHealth(healthRun) {
   const run = healthRun || healthAggregator.run(false);
   return (run.records || [])
    .filter(function (r) { return ['warning', 'degraded', 'failing', 'blocked'].indexOf(r.status) !== -1; })
    .map(function (r) {
      return guard.redact({
        source: 'health', moduleId: r.moduleId, moduleName: r.moduleName,
          status: r.status, severity: r.severity, category: r.category,
          summary: r.summary, detailsSafe: r.detailsSafe, affectedRoutes: r.affectedRoutes,
        affectedFiles: r.affectedFiles, recommendedFix: r.recommendedFix,
      });
    });
}

// Returns candidate incidents (NOT persisted). Caller decides whether to createIncident.
function detect() {
 const healthRun = healthAggregator.run(false);
   const candidates = fromHealth(healthRun).concat(fromRules());
   const counts = candidates.reduce(function (acc, c) { acc[c.severity] = (acc[c.severity] || 0) + 1; return acc; }, {});
 return { ranAt: new Date().toISOString(), healthScore: healthRun.score, candidateCount: candidates.length,
severityCounts: counts, candidates: candidates };
}

module.exports = { detect, fromRules, fromHealth };
