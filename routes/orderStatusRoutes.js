'use strict';
/**
 * Order Status Lookup routes (#114)
 * Self-mountable Express router. server.js is NOT touched.
 *
 * Mount manually:   require('./routes/orderStatusRoutes')(app)
 * Or via aiSuite mountAll (#52).
 *
 * Endpoints (all tenant-scoped via header x-tenant-id or body.tenantId):
 *   POST /api/order-status/ask     { text?, orderId?, phone? } -> { found, order, reply }
 *   GET  /api/order-status/resolve ?orderId= | ?phone=         -> { found, order }
 *   POST /api/order-status/seed    { order }  (local fallback order for testing)
 */
const engine = require('../lib/orderStatus/orderStatusLookup');

function getTenant(req) {
  return (req.headers && req.headers['x-tenant-id'])
    || (req.body && req.body.tenantId)
    || (req.query && req.query.tenantId);
}

module.exports = function mount(app) {
  if (!app || typeof app.post !== 'function') {
    throw new Error('orderStatusRoutes: express app required');
  }

  app.post('/api/order-status/ask', async function (req, res) {
    try {
      const tenantId = getTenant(req);
      const body = req.body || {};
      const out = await engine.answer({
        tenantId: tenantId,
        text: body.text,
        orderId: body.orderId,
        phone: body.phone,
        lang: body.lang
      });
      res.json(Object.assign({ ok: true }, out));
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  app.get('/api/order-status/resolve', function (req, res) {
    try {
      const tenantId = getTenant(req);
      const order = engine.resolveOrder({
        tenantId: tenantId,
        orderId: req.query.orderId,
        phone: req.query.phone,
        text: req.query.text
      });
      res.json({ ok: true, found: !!order, order: order || null });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  app.post('/api/order-status/seed', function (req, res) {
    try {
      const tenantId = getTenant(req);
      const saved = engine.saveLocalOrder(tenantId, (req.body && req.body.order) || {});
      res.json({ ok: true, order: saved });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  return app;
};
