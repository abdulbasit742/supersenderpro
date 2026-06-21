  'use strict';

  /**
      * Dealer Portal service. Orchestrates the masked dealer preview. Strictly
      * preview-only. Every response carries the standard safety envelope. No live
      * order/quote/credit/payment/price mutation. No sends. No external calls.
      */

  const path = require('path');
  const store = require('./store');
  const model = require('./dealerPortalModel');

  // ---- Hard safety envelope (every response spreads this) --------------------
  function envelope(extra) {
    return Object.assign({
         ok: true,
         dryRun: true,
         liveActionsEnabled: false,
         dealerPortalPublicLive: false,
         piiMasked: true,
         externalCallsEnabled: false,
         summaryPreview: {},
         warnings: [],
         blockers: [],
       }, extra || {});
  }

  // ---- Read-only adapters (never rebuild, degrade gracefully) ----------------
  function loadSafe(rel) {
       try { return require(path.join(process.cwd(), rel)); } catch (e) { return null; }
  }


  function resellerAdapter() {
       return loadSafe('lib/resellerPortal/resellerProfiles')
           || loadSafe('lib/resellerPortal/resellerRegistry')
          || null;
  }
  function catalogAdapter() { return loadSafe('lib/productCatalogMaster') || loadSafe('lib/productCatalogMaster/index'); }
  function receivablesAdapter() { return loadSafe('lib/receivablesCenter') || loadSafe('lib/receivablesCenter/index'); }
  function inventoryAdapter() { return loadSafe('lib/inventoryControl') || loadSafe('lib/inventoryControl/index'); }
  function fulfillmentAdapter() { return loadSafe('lib/orderFulfillment') || loadSafe('lib/orderFulfillment/index'); }


// Pull a dealer record: local store first, then reseller profile (read-only).
function resolveDealer(dealerId, warnings) {
    const local = store.getDealer(dealerId);
    if (local) return local;
    const ra = resellerAdapter();
    if (ra && typeof ra.getProfile === 'function') {
        try {
          const p = ra.getProfile(dealerId);
          if (p) { return Object.assign({ id: dealerId, isReseller: true, resellerId: dealerId }, p); }
        } catch (e) { warnings.push('reseller_lookup_failed'); }
    }
    return null;
}


/**
* Masked dealer status. Demo-safe: pass a known preview token (e.g. 'dlr_demo1')
   * to see the sample shape without any real lookup.
   */
function getDealerStatus(dealerId) {
 const warnings = [];
    const blockers = [];


    if (!model.isValidDealerId(dealerId)) {
      blockers.push('missing_dealer_id');
        return envelope({ ok: false, warnings, blockers });
    }

    if (dealerId === 'dlr_demo1') {
        return envelope({
          summaryPreview: model.toDealerPreview({
              id: 'dlr_demo1', name: 'Demo Distribution Co', phone: '03001234567',
              email: 'owner@demo.example', taxId: 'NTN1234567', pricingTier: 'gold',
              status: 'active', creditLimit: 250000, outstanding: 48000, isReseller: true,
              resellerId: 'rsl_demo1',
          }),
          warnings: ['demo_preview_token'],
        });
    }


    const raw = resolveDealer(dealerId, warnings);
    if (!raw) {
      warnings.push('dealer_not_found');
        return envelope({ summaryPreview: {}, warnings, blockers });
    }
    return envelope({ summaryPreview: model.toDealerPreview(raw), warnings, blockers });
}


// Probe which reused modules are present (Part 2 routes use this for graceful UI).
function moduleAvailability() {
 return envelope({
        summaryPreview: {
          reseller: Boolean(resellerAdapter()),
          catalog: Boolean(catalogAdapter()),
          receivables: Boolean(receivablesAdapter()),
          inventory: Boolean(inventoryAdapter()),
          fulfillment: Boolean(fulfillmentAdapter()),


      },
       warnings: ['availability_probe_only'],
     });
}


module.exports = {
  envelope,
     getDealerStatus,
     moduleAvailability,
     _adapters: { resellerAdapter, catalogAdapter, receivablesAdapter, inventoryAdapter, fulfillmentAdapter },
};
