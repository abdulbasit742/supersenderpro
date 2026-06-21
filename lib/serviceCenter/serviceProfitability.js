// lib/serviceCenter/serviceProfitability.js
// Margin preview per work order / job card. Combines labor + parts vs quoted price.
'use strict';


const store = require('./store');
const laborCost = require('./laborCostPreview');
const jobCardModel = require('./jobCardModel');

// Simple quoted-price seed by asset class; preview only.
const QUOTE_SEED = { 'Split AC 1.5 ton': 9000, 'Ceiling wiring': 6000, 'Water motor': 5000 };

function forWorkOrder(woId) {
  const wo = store.getWorkOrder(woId);
    if (!wo) return { ok: false, errors: ['work order not found'] };
    const cards = store.jobCardsForWorkOrder(wo.id);
    let labor = 0, parts = 0;
    cards.forEach((jc) => {
      const l = laborCost.forJobCard(jc.id);
      if (l.ok) labor += l.laborCost;
      parts += jobCardModel.partsCost(jc);
    });
    const cost = +(labor + parts).toFixed(2);
    const quote = QUOTE_SEED[wo.asset] || Math.round(cost * 1.4);
    const margin = +(quote - cost).toFixed(2);
    const marginPct = quote > 0 ? Math.round((margin / quote) * 100) : 0;
    return {
      ok: true,
      ref: wo.ref,
      asset: wo.asset,
      quotedPrice: quote,
      laborCost: +labor.toFixed(2),
      partsCost: +parts.toFixed(2),
      totalCost: cost,
      margin,
      marginPct,
      health: marginPct >= 30 ? 'healthy' : marginPct >= 10 ? 'thin' : 'loss-risk',
      note: 'Preview estimate. No billing performed.'
    };
}

function summary() {
    const rows = store.workOrders.map((w) => forWorkOrder(w.id)).filter((r) => r.ok);
    const totalQuote = rows.reduce((s, r) => s + r.quotedPrice, 0);
    const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
    return {
      workOrders: rows.length,
      totalQuote,
      totalCost,
      totalMargin: +(totalQuote - totalCost).toFixed(2),


     avgMarginPct: rows.length ? Math.round(rows.reduce((s, r) => s + r.marginPct, 0) / rows.length) : 0,
     breakdown: rows.map((r) => ({ ref: r.ref, marginPct: r.marginPct, health: r.health }))
   };
}

module.exports = { forWorkOrder, summary, QUOTE_SEED };
