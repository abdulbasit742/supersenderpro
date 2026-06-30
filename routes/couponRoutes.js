'use strict';
/**
 * Self-mountable coupon engine router.
 * Mount: const couponRoutes = require('./routes/couponRoutes'); couponRoutes.mount(app);
 * or: app.use('/api/coupons', require('./routes/couponRoutes').router());
 * Tenant resolved from req.tenantId | header x-tenant-id | body.tenantId | query.tenantId.
 */
const express = require('express');
const engine = require('../lib/couponEngine/couponEngine');

function resolveTenant(req) {
  return (
    req.tenantId ||
    req.headers['x-tenant-id'] ||
    (req.body && req.body.tenantId) ||
    (req.query && req.query.tenantId) ||
    null
  );
}

function router() {
  const r = express.Router();

  r.post('/', (req, res) => {
    try {
      const tenantId = resolveTenant(req);
      const coupon = engine.createCoupon(tenantId, req.body || {});
      res.json({ ok: true, coupon });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  r.get('/', (req, res) => {
    try {
      res.json({ ok: true, coupons: engine.listCoupons(resolveTenant(req)) });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  r.get('/:code', (req, res) => {
    try {
      const c = engine.getCoupon(resolveTenant(req), req.params.code);
      if (!c) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, coupon: c });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  r.post('/:code/validate', (req, res) => {
    try {
      const out = engine.validateCoupon(resolveTenant(req), req.params.code, req.body || {});
      res.json(out);
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  r.post('/:code/redeem', (req, res) => {
    try {
      const out = engine.redeemCoupon(resolveTenant(req), req.params.code, req.body || {});
      res.status(out.ok ? 200 : 409).json(out);
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  r.post('/:code/offer-message', async (req, res) => {
    try {
      const c = engine.getCoupon(resolveTenant(req), req.params.code);
      if (!c) return res.status(404).json({ ok: false, error: 'not_found' });
      const message = await engine.phraseOffer(c, req.body || {});
      res.json({ ok: true, message });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  r.delete('/:code', (req, res) => {
    try {
      const c = engine.deactivateCoupon(resolveTenant(req), req.params.code);
      if (!c) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, coupon: c });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  return r;
}

function mount(app, base = '/api/coupons') {
  app.use(base, router());
  return app;
}

module.exports = { router, mount };
