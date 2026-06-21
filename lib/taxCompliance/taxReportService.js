  'use strict';
  /**
   * taxReportService.js — builds monthly/quarterly tax report previews from
      * invoice + expense breakdowns. Bridges read-only to Accounting/Receivables/
      * Payables when present, else uses supplied/sample figures. Never files anything.
   */
  const model = require('./taxRuleModel');
  const invoiceTaxPreview = require('./invoiceTaxPreview');
  const expenseTaxPreview = require('./expenseTaxPreview');
  const taxRiskChecker = require('./taxRiskChecker');

  function build(period, figures, rules) {
    const f = figures || model.sampleFigures();
       const inv = invoiceTaxPreview.preview(f.invoices, rules);
       const exp = expenseTaxPreview.preview(f.expenses, rules);
       const report = model.newReport({
         period: period || 'monthly_preview',
         totalTaxCollectedPreview: inv.totalTaxCollectedPreview,
         totalTaxPaidPreview: exp.totalTaxPaidPreview,
         taxableRevenuePreview: inv.taxableRevenuePreview,
         exemptRevenuePreview: inv.exemptRevenuePreview,
         taxableExpensesPreview: exp.taxableExpensesPreview,
       });
       const risk = taxRiskChecker.check(report, rules);
       report.riskLevel = risk.riskLevel;
       return {
         ok: true, dryRun: true, period: report.period,
         totalTaxCollectedPreview: report.totalTaxCollectedPreview,
         totalTaxPaidPreview: report.totalTaxPaidPreview,
         netTaxPayablePreview: report.netTaxPayablePreview,
         taxableRevenuePreview: report.taxableRevenuePreview,
         taxableExpensesPreview: report.taxableExpensesPreview,
         exemptRevenuePreview: report.exemptRevenuePreview,
         riskLevel: report.riskLevel,
         warnings: risk.warnings, blockers: [],
       };
  }
  module.exports = { build };
