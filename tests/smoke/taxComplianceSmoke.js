  'use strict';
  /**
   * tests/smoke/taxComplianceSmoke.js — module-level smoke. No server, no network,
   * no government API. Verifies calc, exemptions, reports, checklist, masked export.
   */
  const path = require('path');
  const assert = require('assert');
  const ROOT = process.cwd();
  const R = (p) => require(path.join(ROOT, p));


  function main() {
    const results = [];
    const ok = (name, fn) => { try { fn(); results.push({ name, status: 'pass' }); } catch (e) { results.push({ name,
  status: 'fail', error: e.message }); } };

    const model = R('lib/taxCompliance/taxRuleModel.js');
    const taxCalculator = R('lib/taxCompliance/taxCalculator.js');
    const invoiceTaxPreview = R('lib/taxCompliance/invoiceTaxPreview.js');
    const expenseTaxPreview = R('lib/taxCompliance/expenseTaxPreview.js');
    const taxReportService = R('lib/taxCompliance/taxReportService.js');
    const taxRiskChecker = R('lib/taxCompliance/taxRiskChecker.js');
    const complianceChecklist = R('lib/taxCompliance/complianceChecklist.js');
    const auditExportPreview = R('lib/taxCompliance/auditExportPreview.js');
    R('routes/taxComplianceRoutes.js');

    ok('rule model forces dryRun true', () => assert.strictEqual(model.newRule({ dryRun: false }).dryRun, true));

    ok('17% of 1000 = 170', () => assert.strictEqual(taxCalculator.calculate({ subtotal: 1000, taxRatePercent: 17
  }).taxAmountPreview, 170));
    ok('exempt yields 0 tax', () => assert.strictEqual(taxCalculator.calculate({ subtotal: 1000, taxRatePercent: 17,
  exempt: true }).taxAmountPreview, 0));
    ok('invoice preview separates exempt revenue', () => { const r =
  invoiceTaxPreview.preview(model.sampleFigures().invoices, model.seeds()); assert.ok(r.exemptRevenuePreview > 0);
  assert.ok(r.totalTaxCollectedPreview > 0); });
    ok('expense preview computes tax paid', () => { const r = expenseTaxPreview.preview(model.sampleFigures().expenses,
  model.seeds()); assert.ok(typeof r.totalTaxPaidPreview === 'number'); });
    ok('report net = collected - paid', () => { const rep = taxReportService.build('monthly_preview',
  model.sampleFigures(), model.seeds()); assert.strictEqual(rep.netTaxPayablePreview,
  Math.round((rep.totalTaxCollectedPreview - rep.totalTaxPaidPreview) * 100) / 100); });
    ok('risk checker returns valid level', () => { const rep = taxReportService.build('monthly_preview',
  model.sampleFigures(), model.seeds()); assert.ok(model.RISK_LEVELS.includes(taxRiskChecker.check(rep,
  model.seeds()).riskLevel)); });
    ok('checklist has safety item passing', () => { const rep = taxReportService.build('monthly_preview',
  model.sampleFigures(), model.seeds()); const c = complianceChecklist.run(model.seeds(), rep); assert.ok(c.items.some((i) => i.id === 'no_government_api' && i.status === 'pass')); });
    ok('audit export is redacted + no live export', () => { const a = auditExportPreview.build('monthly_preview',
  model.sampleFigures()); assert.strictEqual(a.liveExport, false); assert.strictEqual(a.redactedOnly, true);
  assert.ok(!a.recordsPreview.some((r) => /inv_1001/.test(r.id))); });


    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    console.log('[tax-compliance:smoke] passed=%d failed=%d', passed, failed);
    results.filter((r) => r.status === 'fail').forEach((r) => console.log('   FAIL', r.name, '-', r.error));
    process.exit(failed === 0 ? 0 : 1);
  }
  main();
