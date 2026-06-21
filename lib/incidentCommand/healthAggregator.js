'use strict';

/**
    * Incident Command — runs every module adapter (read-only), normalizes their
    * health records, persists a snapshot, and returns an overall score.
    * Never throws: a failing adapter yields an 'unavailable' record.
    */

const registry = require('./moduleRegistry');
const incidentStore = require('./incidentStore');
const sev = require('./severityEngine');
const guard = require('./safetyGuard');

function normalizeRecord(mod, raw) {
   const r = raw || {};
   const status = sev.normalizeStatus(r.status);
   return guard.redact({
     id: 'health_' + mod.id,
     moduleId: mod.id,
     moduleName: mod.name,
     status: status,
     severity: sev.normalizeSeverity(r.severity || sev.severityForStatus(status)),
     category: sev.normalizeCategory(r.category || mod.category),
     summary: String(r.summary || '').slice(0, 240),
     detailsSafe: r.detailsSafe ? String(r.detailsSafe).slice(0, 1000) : null,
     affectedRoutes: Array.isArray(r.affectedRoutes) ? r.affectedRoutes.slice(0, 20) : [],
     affectedFiles: Array.isArray(r.affectedFiles) ? r.affectedFiles.slice(0, 40) : [],
     recommendedFix: r.recommendedFix ? String(r.recommendedFix).slice(0, 500) : null,
     autoFixAvailable: r.autoFixAvailable === true,
     autoFixDryRunOnly: true, // always dry-run in this layer
     lastCheckedAt: new Date().toISOString(),
     createdAt: r.createdAt || new Date().toISOString(),
   });
}

function runOne(mod) {
   const adapter = registry.loadAdapter(mod.adapter);
   if (!adapter || typeof adapter.health !== 'function') {
     return normalizeRecord(mod, { status: 'unavailable', summary: mod.name + ' adapter not available', severity: 'info'
});
   }
   try {
     const raw = adapter.health();
     return normalizeRecord(mod, raw || { status: 'unknown', summary: 'No data' });
   } catch (e) {
     return normalizeRecord(mod, { status: 'unavailable', summary: mod.name + ' health check failed safely', severity:
'info' });
 }
}


function run(persist) {
 const records = registry.list().map(runOne);
   const rollup = sev.score(records);
   if (persist !== false) incidentStore.saveHealth(records);
 return { score: rollup.score, worstStatus: rollup.worstStatus, worstSeverity: rollup.worstSeverity, counts:
rollup.counts, records: records, ranAt: new Date().toISOString() };
}


module.exports = { run, runOne, normalizeRecord };
