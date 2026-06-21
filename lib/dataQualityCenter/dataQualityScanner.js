  'use strict';

  const store = require('./store');
  const redactor = require('./redactor');
  const score = require('./qualityScore');
  const productChecks = require('./productQualityChecks');
  const customerChecks = require('./customerQualityChecks');
  const supplierChecks = require('./supplierQualityChecks');
  const financeChecks = require('./financeQualityChecks');
  const inventoryChecks = require('./inventoryConsistencyChecks');

  const DRY_RUN = String(process.env.DATA_QUALITY_DRY_RUN || 'true') !== 'false';

  function safe(fn, label) {
    try {
          const r = fn();
          return Array.isArray(r) ? r : [];
      } catch (e) {
        return [{
           id: `SCAN_ERR_${label}`,
           ruleId: 'SCAN_ERROR',
           entity: label,
           severity: 'info',
            message: `check failed safely: ${label}`,
          }];
      }
  }

  function runScan(options = {}) {
      const startedAt = new Date().toISOString();
      const entities = options.entities || ['product', 'customer', 'supplier', 'finance', 'inventory'];

      let issues = [];
      if (entities.includes('product')) issues = issues.concat(safe(() => productChecks.run(), 'product'));
      if (entities.includes('customer')) issues = issues.concat(safe(() => customerChecks.run(), 'customer'));
      if (entities.includes('supplier')) issues = issues.concat(safe(() => supplierChecks.run(), 'supplier'));
      if (entities.includes('finance')) issues = issues.concat(safe(() => financeChecks.run(), 'finance'));
      if (entities.includes('inventory')) issues = issues.concat(safe(() => inventoryChecks.run(), 'inventory'));

      // Defensive: ensure every issue is masked before it leaves the scanner.
      issues = issues.map((i, idx) => redactor.redactObject({ id: i.id || `ISSUE_${idx}`, ...i }));

      const scoring = score.compute(issues);
      const scan = {
        id: `scan_${Date.now()}`,
          startedAt,


     finishedAt: new Date().toISOString(),
     dryRun: DRY_RUN,
     entities,
     issueCount: issues.length,
     score: scoring.overall,
     grade: scoring.grade,
     byEntity: scoring.byEntity,
   };

   // Preview-only persistence of findings (never source data).
   store.recordScan(scan);
   store.replaceIssues(issues);

   return { scan, issues, scoring };
}


module.exports = { DRY_RUN, runScan };
