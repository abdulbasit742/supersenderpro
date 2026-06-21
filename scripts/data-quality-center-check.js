  'use strict';

  // Run locally:    node scripts/data-quality-center-check.js
  // Verifies modules load, run safely on whatever data exists, and stay dry-run.


  const assert = require('assert');

  function main() {
    const scanner = require('../lib/dataQualityCenter/dataQualityScanner');
      const score = require('../lib/dataQualityCenter/qualityScore');
      const cleanup = require('../lib/dataQualityCenter/cleanupRecommendation');
      const merge = require('../lib/dataQualityCenter/mergePreview');

      assert.strictEqual(scanner.DRY_RUN, true, 'scanner must default to dry-run');

      const result = scanner.runScan({});
      assert.ok(Array.isArray(result.issues), 'issues must be an array');
      assert.ok(result.scan && typeof result.scan.score === 'number', 'scan must have numeric score');


      const s = score.compute(result.issues);
      assert.ok(s.overall >= 0 && s.overall <= 100, 'score in range');

      const plan = cleanup.buildPlan(result.issues);
      assert.strictEqual(plan.mode, 'preview', 'cleanup must be preview');
      assert.strictEqual(cleanup.applyPlan().applied, false, 'cleanup apply must refuse');
      assert.strictEqual(merge.applyMerge().merged, false, 'merge apply must refuse');

      console.log('[data-quality-center-check] OK', { issues: result.issues.length, score: s.overall, grade: s.grade });
  }

  try { main(); } catch (e) { console.error('[data-quality-center-check] FAIL', e.message); process.exit(1); }
