  'use strict';
  /**
   * invoiceTaxPreview.js — tax breakdown across invoices using matching rules.
      * Reads supplied invoices (or sample). Preview-only.
      */
  const taxCalculator = require('./taxCalculator');

  function rateFor(rules, appliesTo) {
    const rule = (rules || []).find((r) => r.status === 'active' && r.appliesTo.includes(appliesTo) && r.ratePercent > 0);
      return rule ? rule.ratePercent : 0;
  }

  function preview(invoices, rules) {
      const lines = (invoices || []).map((inv) => {
        const rate = inv.exempt ? 0 : rateFor(rules, inv.appliesTo);
        const calc = taxCalculator.calculate({ subtotal: inv.subtotal, taxRatePercent: rate, exempt: inv.exempt });
        return { invoiceId: inv.id, appliesTo: inv.appliesTo, exempt: !!inv.exempt, subtotalPreview: calc.subtotalPreview,
  taxRatePreview: rate, taxAmountPreview: calc.taxAmountPreview, totalWithTaxPreview: calc.totalWithTaxPreview };
    });
      const totalTaxCollectedPreview = lines.reduce((a, l) => a + l.taxAmountPreview, 0);
      const taxableRevenuePreview = lines.filter((l) => !l.exempt).reduce((a, l) => a + l.subtotalPreview, 0);
      const exemptRevenuePreview = lines.filter((l) => l.exempt).reduce((a, l) => a + l.subtotalPreview, 0);
      return { ok: true, dryRun: true, lines, totalTaxCollectedPreview, taxableRevenuePreview, exemptRevenuePreview };
  }
  module.exports = { preview, rateFor };
