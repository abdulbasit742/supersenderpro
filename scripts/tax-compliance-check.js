  'use strict';
  /**
   * scripts/tax-compliance-check.js — loads the tax layer, confirms safe defaults,
   * exercises calculator/report/checklist on sample figures, writes a report to
   * artifacts/. Read-only on source; only writes under artifacts/. No network, no
   * government API, no secrets printed.
   */
  const fs = require('fs');
  const path = require('path');
  const ROOT = process.cwd();
  const R = (p) => require(path.join(ROOT, p));

  function main() {
    const model = R('lib/taxCompliance/taxRuleModel.js');
    const taxCalculator = R('lib/taxCompliance/taxCalculator.js');
    const taxReportService = R('lib/taxCompliance/taxReportService.js');
    const complianceChecklist = R('lib/taxCompliance/complianceChecklist.js');
    const auditExportPreview = R('lib/taxCompliance/auditExportPreview.js');
    R('routes/taxComplianceRoutes.js');

    const rules = model.seeds();
    const figures = model.sampleFigures();
    const blockers = [];
    const warnings = [];

    // 17% of 1000 must be 170
    const calc = taxCalculator.calculate({ subtotal: 1000, taxRatePercent: 17, exempt: false });
    if (calc.taxAmountPreview !== 170) blockers.push('calc_wrong:' + calc.taxAmountPreview);
    // exempt must yield 0 tax
    const ex = taxCalculator.calculate({ subtotal: 1000, taxRatePercent: 17, exempt: true });
    if (ex.taxAmountPreview !== 0) blockers.push('exempt_not_zero');

    const report = taxReportService.build('monthly_preview', figures, rules);
    if (typeof report.netTaxPayablePreview !== 'number') blockers.push('net_not_number');
    if (!model.RISK_LEVELS.includes(report.riskLevel)) blockers.push('bad_risk_level');

    const checklist = complianceChecklist.run(rules, report);
    if (!checklist.items.some((i) => i.id === 'no_government_api' && i.status === 'pass'))
  blockers.push('safety_item_missing');

    const audit = auditExportPreview.build('monthly_preview', figures);
    if (audit.liveExport !== false || audit.redactedOnly !== true) blockers.push('audit_export_not_safe');
    if (audit.recordsPreview.some((r) => /inv_1001|bill_551/.test(r.id))) blockers.push('audit_export_ref_not_masked');


    const result = {
      generatedAt: new Date().toISOString(),
      dryRun: true, liveActionsEnabled: false, noTaxFiling: true, noGovernmentApi: true,
      module: 'tax-compliance',
      taxRules: rules.length,
      monthlyNetTaxPayablePreview: report.netTaxPayablePreview,
      riskLevel: report.riskLevel,
      checklistReady: checklist.ready,
      warnings, blockers,
      pass: blockers.length === 0,
    };


    const ARTIFACTS = path.join(ROOT, 'artifacts');
    if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
    fs.writeFileSync(path.join(ARTIFACTS, 'tax_compliance_check.json'), JSON.stringify(result, null, 2));


    console.log('[tax-compliance:check] rules=%d net=%d risk=%s blockers=%d pass=%s', result.taxRules,
  result.monthlyNetTaxPayablePreview, result.riskLevel, result.blockers.length, result.pass);
    process.exit(result.pass ? 0 : 1);
  }
  main();
