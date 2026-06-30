// routes/apiGatewayRoutes.js — REST surface for Public API Keys + Outbound Webhooks.
// Mount at /api/api-gateway. Admin endpoints here are intended to sit behind your existing
// admin/session auth; the issued KEYS are what external integrators use elsewhere via
// requireApiKey(scope) on your public API routes.

const express = require('express');
const router = express.Router();

let ag = null; try { ag = require('../lib/apiGateway'); } catch (e) { ag = null; }
function guard(req, res) { if (!ag) { res.status(503).json({ ok: false, error: 'api gateway not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!ag) return res.json({ ok: false, error: 'api gateway not loaded' });
 const r = ag.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(ag.doctor.run()); });
router.get('/scopes', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, scopes: ag.SCOPES, events: ag.webhookSubscriptions.KNOWN_EVENTS }); });

// API keys — secret is returned ONCE on issue/rotate.
router.post('/keys', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...ag.keyStore.issue(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/keys', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ag.keyStore.all() }); });
router.get('/keys/:id', (req, res) => { if (!guard(req, res)) return; const k = ag.keyStore.getById(req.params.id); if (!k) return res.status(404).json({ ok: false, error: 'key not found' }); res.json({ ok: true, key: k }); });
router.post('/keys/:id/revoke', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, key: ag.keyStore.revoke(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/keys/:id/rotate', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...ag.keyStore.rotate(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Webhook subscriptions — signing secret returned ONCE on create.
router.post('/webhooks', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...ag.webhookSubscriptions.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/webhooks', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ag.webhookSubscriptions.all() }); });
router.post('/webhooks/:id/active', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, subscription: ag.webhookSubscriptions.setActive(req.params.id, (req.body || {}).active) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.delete('/webhooks/:id', (req, res) => { if (!guard(req, res)) return; ag.webhookSubscriptions.remove(req.params.id); res.json({ ok: true }); });

// Emit a test/real event to subscribers (enqueues deliveries).
router.post('/emit', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (!b.event) return res.status(400).json({ ok: false, error: 'event is required' }); res.json({ ok: true, ...ag.webhookDispatcher.emit(b.event, b.payload || {}) }); });
// Process due deliveries (wire to node-cron, or call manually/admin).
router.post('/deliveries/tick', async (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...(await ag.webhookDispatcher.tick()) }); });
router.get('/deliveries', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ag.webhookDispatcher.deliveries({ status: req.query.status, subscriptionId: req.query.subscriptionId, limit: Number(req.query.limit) || 100 }) }); });

module.exports = router;
