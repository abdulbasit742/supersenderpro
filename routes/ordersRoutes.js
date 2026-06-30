// routes/ordersRoutes.js — REST surface for Order Management. Mount at /api/orders.

const express = require('express');
const router = express.Router();

let od = null; try { od = require('../lib/orders'); } catch (e) { od = null; }
function guard(req, res) { if (!od) { res.status(503).json({ ok: false, error: 'orders not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!od) return res.json({ ok: false, error: 'orders not loaded' });
 const r = od.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(od.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...od.orderEngine.overview() }); });

// Preview totals without creating an order (cart pricing). Body: { items, couponCode, contact }
router.post('/quote', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, quote: od.totals.compute(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.post('/orders', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, order: od.orderEngine.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/orders', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: od.orderEngine.list({ status: req.query.status, contact: req.query.contact, limit: Number(req.query.limit) || 200 }) }); });
router.get('/orders/:id', (req, res) => { if (!guard(req, res)) return; const o = od.orderEngine.get(req.params.id); if (!o) return res.status(404).json({ ok: false, error: 'order not found' }); res.json({ ok: true, order: o }); });

router.post('/orders/:id/place', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await od.orderEngine.place(req.params.id)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/orders/:id/paid', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await od.orderEngine.markPaid(req.params.id, req.body || {})) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/orders/:id/fulfill', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await od.orderEngine.fulfill(req.params.id)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/orders/:id/deliver', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await od.orderEngine.deliver(req.params.id)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/orders/:id/cancel', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await od.orderEngine.cancel(req.params.id, (req.body || {}).reason)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/orders/:id/refund', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await od.orderEngine.refund(req.params.id, (req.body || {}).reason)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.setNotifier = (fn) => (od ? od.notify.setNotifier(fn) : false);

module.exports = router;
