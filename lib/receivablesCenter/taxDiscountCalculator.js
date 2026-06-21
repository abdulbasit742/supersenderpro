  'use strict';

  /**
   * Receivables Center — tax/discount/shipping calculator (preview).
   *
   * Pure function. Discount can be percent or flat. Tax applied after discount.
   * Returns subtotal/discount/tax/shipping/total + margin preview (revenue-cost).
   */


  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  function calculate(input) {
    const i = input || {};
    const items = Array.isArray(i.items) ? i.items : [];
    const warnings = [];

    let subtotal = 0;
    let cost = 0;
    for (const it of items) {
        const qty = Math.max(0, Number(it.qty) || 0);
        const price = Math.max(0, Number(it.unitPrice) || 0);
        subtotal += qty * price;
        cost += qty * Math.max(0, Number(it.cost) || 0);
    }

    // discount
    let discount = 0;
    if (i.discountType === 'percent') discount = subtotal * (Math.max(0, Math.min(100, Number(i.discountValue) || 0)) /
  100);
    else discount = Math.max(0, Number(i.discountValue) || 0);
    if (discount > subtotal) { discount = subtotal; warnings.push('discount capped at subtotal'); }

    const taxable = subtotal - discount;
    const taxRate = Math.max(0, Math.min(100, Number(i.taxRate) || 0));
    const tax = taxable * (taxRate / 100);
    const shipping = Math.max(0, Number(i.shipping) || 0);

    const total = taxable + tax + shipping;
    const margin = taxable - cost; // simple margin preview (excl. tax/shipping)

    return {
        ok: true,
        dryRun: true,
        subtotalPreview: round2(subtotal),
        discountPreview: round2(discount),


        taxPreview: round2(tax),
        shippingPreview: round2(shipping),
        totalPreview: round2(total),
        marginPreview: round2(margin),
        warnings,
        blockers: [],
      };
  }

  module.exports = { calculate, round2 };
