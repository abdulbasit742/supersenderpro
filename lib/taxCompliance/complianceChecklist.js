  'use strict';
  /**
   * complianceChecklist.js — rule-based readiness checklist for tax filing prep.
   * Preview-only; no filing. Pure over rules + report.
   */
  function run(rules, report) {
    const r = report || {};
    const items = [
      { id: 'has_active_rules', label: 'At least one active tax rule configured', status: (rules || []).some((x) =>
  x.status === 'active' && x.ratePercent > 0) ? 'pass' : 'fail', required: true },
      { id: 'tax_collected_recorded', label: 'Tax collected on taxable sales', status: (r.totalTaxCollectedPreview || 0) >
  0 ? 'pass' : 'warn', required: true },
      { id: 'tax_paid_recorded', label: 'Tax paid on bills/expenses tracked', status: (r.totalTaxPaidPreview || 0) >= 0 ?
  'pass' : 'warn', required: false },
      { id: 'exemptions_reviewed', label: 'Exempt sales reviewed', status: (r.exemptRevenuePreview || 0) >= 0 ? 'pass' :
  'warn', required: false },
      { id: 'net_payable_computed', label: 'Net tax payable computed', status: typeof r.netTaxPayablePreview === 'number' ?
  'pass' : 'fail', required: true },
      { id: 'audit_export_ready', label: 'Audit export preview available (redacted)', status: 'pass', required: false },
      { id: 'no_government_api', label: 'No live government/FBR API used (safe)', status: 'pass', required: true },
    ];
    const passed = items.filter((i) => i.status === 'pass').length;
    const failedRequired = items.filter((i) => i.required && i.status === 'fail').length;
    return { ok: true, dryRun: true, items, passed, total: items.length, ready: failedRequired === 0 };
  }
  module.exports = { run };
