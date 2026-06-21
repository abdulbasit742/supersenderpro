   'use strict';
   /** Aggregate commission report across all resellers (preview only). */
   const resellers = require('./resellerRegistry');
   const commissionPreview = require('./commissionPreview');
   function generate(period) {
       const rows = resellers.list().map((r) => commissionPreview.preview(r.id, period)).filter((x) => x.ok !== false);
       return { period: period || 'current', totalCommissionPreview: rows.reduce((a, x) => a + (x.commissionAmountPreview ||
   0), 0), rows, payoutStatus: 'preview_only', dryRun: true };
   }
   module.exports = { generate };
