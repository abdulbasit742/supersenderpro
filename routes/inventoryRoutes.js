// routes/inventoryRoutes.js — REST surface for Inventory & Stock. Mount at /api/inventory.

const express = require('express');
const router = express.Router();

let iv = null; try { iv = require('../lib/inventory'); } catch (e) { iv = null; }
function guard(req, res) { if (!iv) { res.status(503).json({ ok: false, error: 'inventory not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!iv) return res.json({ ok: false, error: 'inventory not loaded' });
 const r = iv.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(iv.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...iv.stockEngine.overview() }); });

// Products
router.post('/products', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, product: iv.productStore.upsert(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/products', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: iv.productStore.all() }); });
router.get('/products/:sku', (req, res) => { if (!guard(req, res)) return; const p = iv.productStore.get(req.params.sku); if (!p) return res.status(404).json({ ok: false, error: 'product not found' }); res.json({ ok: true, product: p, ledger: iv.ledger.forSku(req.params.sku, 50) }); });
router.get('/low-stock', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: iv.productStore.lowStock() }); });

// Stock movements
router.post('/restock', (req, res) => { if (!guard(req, res)) return; try { const b = req.body || {}; res.json({ ok: true, product: iv.stockEngine.restock(b.sku, b.qty, b.note) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/adjust', async (req, res) => { if (!guard(req, res)) return; try { const b = req.body || {}; res.json({ ok: true, product: await iv.stockEngine.adjust(b.sku, b.delta, b.note) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Reservation flow
router.post('/reserve', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await iv.stockEngine.reserve(req.body || {})) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/reserve-order', async (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; res.json({ ok: true, ...(await iv.stockEngine.reserveOrder(b.orderId, b.items || [])) }); });
router.post('/commit', async (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...(await iv.stockEngine.commit((req.body || {}).reservationId)) }); });
router.post('/release', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...iv.stockEngine.release((req.body || {}).reservationId) }); });

router.get('/ledger', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: req.query.sku ? iv.ledger.forSku(req.query.sku, Number(req.query.limit) || 100) : iv.ledger.recent(Number(req.query.limit) || 100) }); });

module.exports = router;
