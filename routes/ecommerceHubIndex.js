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
    try { console.error('[ecommerceHubIndex] skip ' + modPath + ': ' + (e && e.message)); } catch (_e) {}
  }
}

mount('./ecommerceHubRoutes');
mount('./ecommerceHubOrderRoutes');
mount('./ecommerceHubGrowthRoutes');
mount('./ecommerceHubExtraRoutes');
mount('./ecommerceHubOpsRoutes');
mount('./ecommerceHubBatch3Routes');
mount('./ecommerceHubBatch4Routes');
mount('./ecommerceHubBatch5Routes');
mount('./ecommerceHubBatch6Routes');
mount('./ecommerceHubBatch7Routes');
mount('./ecommerceHubBatch8Routes');

router.get('/_modules', function (req, res) {
  res.json({ ok: true, note: 'Ecommerce Hub aggregated router mounted.' });
});

module.exports = router;
