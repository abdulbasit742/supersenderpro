  'use strict';


  /** Receivables Center — per-customer balance rollup (masked). */

  const store = require('./store');


  function balances() {
    const map = {};
      for (const inv of store.readInvoices()) {
        const key = inv.customerNameSafe || 'Customer';
          if (!map[key]) map[key] = { customerNameSafe: key, invoices: 0, totalPreview: 0, paidPreview: 0, balancePreview: 0 };
          map[key].invoices += 1;
          map[key].totalPreview = round(map[key].totalPreview + (inv.totalPreview || 0));
          map[key].paidPreview = round(map[key].paidPreview + (inv.paidAmountPreview || 0));
          map[key].balancePreview = round(map[key].balancePreview + (inv.balanceDuePreview || 0));
      }
      return Object.values(map).sort((a, b) => b.balancePreview - a.balancePreview);
  }
  function round(n) { return Math.round((Number(n) || 0) * 100) / 100; }


  module.exports = { balances };
