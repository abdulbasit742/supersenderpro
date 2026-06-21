  'use strict';
  /**
   * taxCalculator.js — computes tax on an amount given a rule (or rate). Handles
      * exemptions. Pure math; no I/O. All outputs are *Preview.
      */
  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  function calculate(input) {
    const i = input || {};
       const subtotal = Number(i.subtotal) || 0;
       const rate = Number(i.taxRatePercent != null ? i.taxRatePercent : (i.rule && i.rule.ratePercent)) || 0;
       const exempt = !!i.exempt;
       const taxableAmountPreview = exempt ? 0 : subtotal;
       const exemptAmountPreview = exempt ? subtotal : 0;
       const taxAmountPreview = round2(taxableAmountPreview * (rate / 100));
       const warnings = [];
       if (rate === 0 && !exempt) warnings.push('zero_rate_non_exempt');
       if (rate > 0 && exempt) warnings.push('rate_set_but_marked_exempt');
       return {
         ok: true, dryRun: true,
         subtotalPreview: round2(subtotal),
         taxableAmountPreview: round2(taxableAmountPreview),
         exemptAmountPreview: round2(exemptAmountPreview),
         taxRatePreview: rate,
         taxAmountPreview,
         totalWithTaxPreview: round2(subtotal + taxAmountPreview),
         warnings, blockers: [],
       };
  }
  module.exports = { calculate, round2 };
