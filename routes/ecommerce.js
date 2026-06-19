'use strict';

/**
 * routes/ecommerce.js — REST API for e-commerce platform connections
 * (Shopify, WooCommerce, Daraz, Etsy, Amazon). Makes the Connections page
 * fully functional: connect + test + sync products + pull orders + send
 * WhatsApp order confirmations.
 *
 * Wiring (near other route mounts in server.js):
 *   const { mountEcommerce } = require('./routes/ecommerce');
 *   mountEcommerce(app, { sendMessage: async (to, msg) => waClient.sendText(to, msg) });
 */

const express = require('express');
const manager = require('../lib/ecommerceManager');
const store = require('../lib/ecommerceStore');

function mountEcommerce(app, deps = {}) {
  const router = express.Router();
  const sendMessage = typeof deps.sendMessage === 'function' ? deps.sendMessage : null;

  // Available platforms + their credential fields (drives the connect form).
  router.get('/ecommerce/platforms', (req, res) => {
    res.json({ ok: true, platforms: manager.listPlatforms() });
  });

  // List saved connections (credentials redacted).
  router.get('/ecommerce/connections', (req, res) => {
    res.json({ ok: true, connections: store.listConnections().map(store.redact) });
  });

  // Connect a new store (validates + live-tests credentials before saving).
  router.post('/ecommerce/connect', async (req, res) => {
    const { platform, credentials } = req.body || {};
    if (!platform) return res.status(400).json({ ok: false, error: 'platform is required' });
    try {
      const out = await manager.connect(platform, credentials || {});
      res.status(out.ok ? 201 : 400).json(out);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Re-test an existing connection.
  router.post('/ecommerce/connections/:id/test', async (req, res) => {
    try { res.json(await manager.testConnection(req.params.id)); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Sync products from the store into the local cache.
  router.post('/ecommerce/connections/:id/sync-products', async (req, res) => {
    try { res.json(await manager.syncProducts(req.params.id, undefined, { limit: (req.body && req.body.limit) || 50 })); }
    catch (e) { res.status(502).json({ ok: false, error: e.message }); }
  });

  // Read cached products.
  router.get('/ecommerce/connections/:id/products', (req, res) => {
    const c = store.getConnection(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, products: c.products || [], lastSyncAt: c.lastSyncAt });
  });

  // Pull latest orders from the store.
  router.post('/ecommerce/connections/:id/orders', async (req, res) => {
    try { res.json(await manager.fetchOrders(req.params.id, undefined, { limit: (req.body && req.body.limit) || 50 })); }
    catch (e) { res.status(502).json({ ok: false, error: e.message }); }
  });

  // Read cached orders.
  router.get('/ecommerce/connections/:id/orders', (req, res) => {
    const c = store.getConnection(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, orders: c.orders || [] });
  });

  // Send a WhatsApp order confirmation for a specific cached order.
  router.post('/ecommerce/connections/:id/orders/:orderId/confirm', async (req, res) => {
    const c = store.getConnection(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    const order = (c.orders || []).find((o) => o.externalId === req.params.orderId);
    if (!order) return res.status(404).json({ ok: false, error: 'order not found (sync orders first)' });
    try {
      const out = await manager.sendOrderConfirmation(order, {
        sendMessage,
        templateId: (req.body && req.body.templateId) || null,
        body: (req.body && req.body.body) || null,
      });
      res.json(out);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Toggle active / pause.
  router.put('/ecommerce/connections/:id', (req, res) => {
    const c = store.updateConnection(req.params.id, { isActive: !!(req.body || {}).isActive });
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, connection: store.redact(c) });
  });

  // Disconnect.
  router.delete('/ecommerce/connections/:id', (req, res) => {
    if (!manager.disconnect(req.params.id)) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true });
  });

  app.use('/api', router);
  return { router };
}

module.exports = { mountEcommerce };
