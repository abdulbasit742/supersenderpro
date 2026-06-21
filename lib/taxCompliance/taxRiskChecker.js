  'use strict';
  /**
   * taxRiskChecker.js — flags tax compliance risks from a report + rules. Pure.
   */
  function check(report, rules) {
    const warnings = [];
    let score = 0;
    const r = report || {};
    if ((r.netTaxPayablePreview || 0) < 0) { warnings.push('negative_net_tax_payable_check_inputs'); score += 1; }
    if ((r.totalTaxCollectedPreview || 0) === 0 && (r.taxableRevenuePreview || 0) > 0) {
  warnings.push('taxable_revenue_but_no_tax_collected'); score += 3; }
    if ((r.exemptRevenuePreview || 0) > (r.taxableRevenuePreview || 0)) {
  warnings.push('exempt_exceeds_taxable_review_exemptions'); score += 2; }
    const activeRules = (rules || []).filter((x) => x.status === 'active' && x.ratePercent > 0);
    if (activeRules.length === 0) { warnings.push('no_active_tax_rules'); score += 2; }
    const riskLevel = score >= 4 ? 'critical' : score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';
    return { riskLevel, warnings, score };
  }
  module.exports = { check };
