'use strict';

/**
 * Ecommerce Hub — Express routes (Phase 1, read-only).
 * Aggregated products/clients across platforms. No writes, no payment, no send.
 */

const express = require('express');
const path = require('path');
const router = express.Router();

const registry = require('../lib/ecommerceHub/registry');
const productStore = require('../lib/ecommerceHub/productStore');
const wa = require('../lib/ecommerceHub/waCommands');
const base = require('../lib/ecommerceHub/connectorBase');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';

function guard(req, res, next) {
  if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' });
  next();
}

router.get('/status', function (req, res) {
  res.json({
    ok: true, module: 'ecommerce-hub', phase: 1, status: 'available',
    enabled: ENABLED, dryRun: base.hubDryRun(), liveActionsEnabled: false,
    platforms: registry.list(), store: productStore.status(),
    timestamp: new Date().toISOString()
  });
});

// GET /platforms — registered adapters + key/live status
router.get('/platforms', guard, function (req, res) {
  res.json({ ok: true, platforms: registry.list() });
});

// POST /sync — refresh cache from all adapters (dry-run = sample data)
router.post('/sync', guard, function (req, res) {
  wa.refreshCache().then(function (r) { res.json({ ok: true, synced: r }); })
    .catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});

// GET /products — aggregated, normalized products
router.get('/products', guard, function (req, res) {
  registry.allProducts().then(function (products) {
    productStore.saveProducts(products);
    res.json({ ok: true, products: products });
  });
});

// GET /clients — aggregated, masked clients
router.get('/clients', guard, function (req, res) {
  registry.allClients().then(function (clients) {
    productStore.saveClients(clients);
    res.json({ ok: true, clients: clients });
  });
});

// GET /preview/wa?cmd=!shop — preview the exact WhatsApp reply text
router.get('/preview/wa', guard, function (req, res) {
  wa.handle(req.query.cmd || '!shop').then(function (reply) {
    res.json({ ok: true, cmd: req.query.cmd || '!shop', reply: reply });
  });
});

router.get('/ui', function (req, res) { res.sendFile(path.join(process.cwd(), 'public', 'ecommerce-hub.html')); });

module.exports = router;
