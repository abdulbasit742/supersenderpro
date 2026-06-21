  'use strict';
  /**
      * expenseTaxPreview.js — tax-paid breakdown across supplier bills/expenses.
      * Preview-only.
   */
  const taxCalculator = require('./taxCalculator');
  const invoiceTaxPreview = require('./invoiceTaxPreview');


  function preview(expenses, rules) {
    const lines = (expenses || []).map((ex) => {
        const rate = ex.exempt ? 0 : invoiceTaxPreview.rateFor(rules, ex.appliesTo);
        const calc = taxCalculator.calculate({ subtotal: ex.subtotal, taxRatePercent: rate, exempt: ex.exempt });
      return { expenseId: ex.id, appliesTo: ex.appliesTo, subtotalPreview: calc.subtotalPreview, taxRatePreview: rate,
  taxAmountPreview: calc.taxAmountPreview };
      });
      const totalTaxPaidPreview = lines.reduce((a, l) => a + l.taxAmountPreview, 0);
      const taxableExpensesPreview = lines.reduce((a, l) => a + l.subtotalPreview, 0);
      return { ok: true, dryRun: true, lines, totalTaxPaidPreview, taxableExpensesPreview };
  }
  module.exports = { preview };
