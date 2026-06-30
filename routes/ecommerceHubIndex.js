'use strict';

/**
 * Ecommerce Hub — single mount point for ALL hub routers.
 * Wiring is now ONE line in server.js:
 *
 *   app.use('/api/ecommerce-hub', require('./routes/ecommerceHubIndex'));
 *
 * This mounts the core hub + every batch under /api/ecommerce-hub/*.
 * Each sub-router is required defensively so a missing file never crashes boot.
 */

const express = require('express');
const router = express.Router();

function mount(modPath) {
  try {
    const r = require(modPath);
    router.use(r);
  } catch (e) {
    // Non-fatal: log and continue so one bad module can't take down the app.
    try { console.error('[ecommerceHubIndex] skip ' + modPath + ': ' + (e && e.message)); } catch (_e) {}
  }
}

// Core (status/platforms/products/clients/sync/preview/ui)
mount('./ecommerceHubRoutes');
// Orders + COD + tracking
mount('./ecommerceHubOrderRoutes');
// Growth/lifecycle (cart, status, reviews, alerts, coupons, broadcast, reorder)
mount('./ecommerceHubGrowthRoutes');
// Engagement + analytics (loyalty, faq, analytics, lang)
mount('./ecommerceHubExtraRoutes');
// Ops (courier, export, segments, scheduler, catalog cards)
mount('./ecommerceHubOpsRoutes');
// Batch 3 (agent, order search, wishlist, pricewatch, bundle, risk)
mount('./ecommerceHubBatch3Routes');
// Batch 4 (invoice, nps, referral, back-in-stock, drip, cod-otp, stores, jobs)
mount('./ecommerceHubBatch4Routes');
// Batch 5 (currency, tax, packing slip, returns, gift, hold, crm, timeline, flash, webhooks)
mount('./ecommerceHubBatch5Routes');
// Batch 6 (unified inventory, clv, subs, slots, geo-fees, import, tickets, tiers, report, conversion, quick-replies, order-edit)
mount('./ecommerceHubBatch6Routes');
// Batch 7 (search, recommend, waitlist, notes, eta, pay-link, hours, blacklist, stock-sync, bestsellers, birthday, browse, qr)
mount('./ecommerceHubBatch7Routes');

router.get('/_modules', function (req, res) {
  res.json({ ok: true, note: 'Ecommerce Hub aggregated router mounted.' });
});

module.exports = router;
