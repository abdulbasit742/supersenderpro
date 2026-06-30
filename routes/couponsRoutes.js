// routes/couponsRoutes.js — REST surface for Coupons & Discount Codes. Mount at /api/coupons.

const express = require('express');
const router = express.Router();

let cp = null; try { cp = require('../lib/coupons'); } catch (e) { cp = null; }
function guard(req, res) { if (!cp) { res.status(503).json({ ok: false, error: 'coupons not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!cp) return res.json({ ok: false, error: 'coupons not loaded' });
 const r = cp.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(cp.doctor.run()); });

// Coupons
router.post('/coupons', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, coupon: cp.couponStore.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/coupons', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: cp.couponStore.all() }); });
router.get('/coupons/:code', (req, res) => { if (!guard(req, res)) return; const c = cp.couponStore.getByCode(req.params.code); if (!c) return res.status(404).json({ ok: false, error: 'coupon not found' }); res.json({ ok: true, coupon: c, stats: cp.redemption.stats(req.params.code) }); });
router.post('/coupons/:id/active', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, coupon: cp.couponStore.setActive(req.params.id, (req.body || {}).active) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/coupons/bulk', (req, res) => { if (!guard(req, res)) return; try { const b = req.body || {}; res.json({ ok: true, coupons: cp.couponStore.bulkGenerate(b.count, b.options || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Validate (no redeem) + redeem (records). Body: { code, amount, contact, orderId? }
router.post('/validate', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...cp.validator.validate(req.body || {}) }); });
router.post('/redeem', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...cp.redemption.redeem(req.body || {}) }); });

router.get('/ledger', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: cp.redemption.ledger({ code: req.query.code, contact: req.query.contact, limit: Number(req.query.limit) || 200 }) }); });

module.exports = router;
