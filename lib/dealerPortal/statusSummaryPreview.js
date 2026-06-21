'use strict';


/**
 * Dealer Portal status summary. Aggregates the dealer's own pricing tier,
    * credit, outstanding, reorder list, and order/delivery status into ONE masked
    * preview. Every reused module is read-only and optional — missing modules add
    * a warning, never a crash. No figure here is an exact ledger value.
    */


const svc = require('./dealerPortalService');
const R = require('./redactor');


function safeCall(fn, fallback) {
  try { return fn(); } catch (e) { return fallback; }
}

function buildSummary(dealerId) {
  const warnings = [];
     const blockers = [];


     const base = svc.getDealerStatus(dealerId);
     if (!base.ok) return base; // propagates blockers (e.g. missing id)
     if (Array.isArray(base.warnings)) warnings.push.apply(warnings, base.warnings);

     const A = svc._adapters;
     const dealer = base.summaryPreview || {};

     // Receivables (credit / outstanding) — read-only, masked.
     let receivablesPreview = { available: false };
     const rec = A.receivablesAdapter();
     if (rec && typeof rec.dealerOutstandingPreview === 'function') {
       receivablesPreview = safeCall(() => {
        const r = rec.dealerOutstandingPreview(dealerId) || {};
        return { available: true, outstandingPreview: R.maskMoney(r.outstanding), overdueBucketsPreview: r.overdueBuckets
|| [] };
    }, { available: false });
     } else { warnings.push('receivables_module_not_available'); }


     // Open orders + delivery status — read-only, masked.
     let ordersPreview = { available: false, openOrdersPreview: 0, recentPreview: [] };
     const ful = A.fulfillmentAdapter();


      if (ful && typeof ful.dealerOrdersPreview === 'function') {
        ordersPreview = safeCall(() => {
          const o = ful.dealerOrdersPreview(dealerId) || {};
            const list = Array.isArray(o.orders) ? o.orders.slice(0, 20) : [];
            return {
              available: true,
              openOrdersPreview: Number(o.openCount) || list.length,
              recentPreview: list.map((x) => ({ refMasked: R.maskRef(x.id), statusPreview: x.status || 'unknown' })),
            };
        }, { available: false, openOrdersPreview: 0, recentPreview: [] });
      } else { warnings.push('fulfillment_module_not_available'); }


      // Reorder suggestions from catalog tier pricing — read-only, masked.
      let reorderPreview = { available: false, itemsPreview: [] };
      const cat = A.catalogAdapter();
      if (cat && typeof cat.tierReorderPreview === 'function') {
        reorderPreview = safeCall(() => {
            const c = cat.tierReorderPreview(dealer.pricingTierPreview) || {};
            const items = Array.isArray(c.items) ? c.items.slice(0, 25) : [];
        return { available: true, itemsPreview: items.map((it) => ({ skuMasked: R.maskRef(it.sku), tierPricePreview:
  R.maskMoney(it.tierPrice) })) };
        }, { available: false, itemsPreview: [] });
      } else { warnings.push('catalog_module_not_available'); }

      return svc.envelope({
        summaryPreview: {
          dealer: dealer,
            receivables: receivablesPreview,
            orders: ordersPreview,
            reorder: reorderPreview,
        },
        warnings: warnings,
        blockers: blockers,
      });
  }


  module.exports = { buildSummary };
