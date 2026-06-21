  'use strict';
  /**
   * auditExportPreview.js — builds a REDACTED, preview-only audit export. No file
   * is written, no filing performed. Refs masked.
   */
  const redactor = require('./redactor');


  function build(period, figures) {
    const f = figures || {};
    const records = []
      .concat((f.invoices || []).map((inv) => ({ kind: 'invoice', id: redactor.maskRef(inv.id), appliesTo: inv.appliesTo,
  subtotalPreview: inv.subtotal, exempt: !!inv.exempt })))
      .concat((f.expenses || []).map((ex) => ({ kind: 'expense', id: redactor.maskRef(ex.id), appliesTo: ex.appliesTo,
  subtotalPreview: ex.subtotal })));
    return {
      ok: true, dryRun: true, liveExport: false, redactedOnly: true,
      reportPeriod: period || 'monthly_preview',
      recordsPreview: records.slice(0, 500),
      warnings: records.length > 500 ? ['truncated_to_500'] : [],
      blockers: [],
    };
  }
  module.exports = { build };
