// routes/inboundWebhooksRoutes.js — REST surface for Inbound Webhook Ingestion.
// Admin API mounts at /api/inbound-webhooks. The PUBLIC receiver is exported separately and should
// be mounted with a raw body parser at '/_in/:slug' so signature verification sees the exact bytes.

const express = require('express');
const router = express.Router();

let iw = null; try { iw = require('../lib/inboundWebhooks'); } catch (e) { iw = null; }
function guard(req, res) { if (!iw) { res.status(503).json({ ok: false, error: 'inbound webhooks not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!iw) return res.json({ ok: false, error: 'inbound webhooks not loaded' });
 const r = iw.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(iw.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...iw.ingestEngine.overview() }); });

// Endpoints — secret returned ONCE on create.
router.post('/endpoints', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...iw.endpointStore.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/endpoints', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: iw.endpointStore.all() }); });
router.post('/endpoints/:id/active', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, endpoint: iw.endpointStore.setActive(req.params.id, (req.body || {}).active) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/endpoints/:id/mapping', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, endpoint: iw.endpointStore.setMapping(req.params.id, (req.body || {}).mapping) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.get('/events', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: iw.ingestEngine.events(Number(req.query.limit) || 100, req.query.slug || null) }); });

// PUBLIC receiver — mount with a raw body parser so HMAC sees exact bytes:
//   app.post('/_in/:slug', express.raw({ type: '*/*' }), inboundWebhooksRoutes.receiver);
async function receiver(req, res) {
 if (!iw) return res.status(503).json({ ok: false, error: 'unavailable' });
 const rawBody = (req.body && req.body.toString) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
 const result = await iw.ingestEngine.ingest(req.params.slug, rawBody, req.headers || {});
 res.status(result.status || 200).json({ ok: result.ok !== false, event: result.event, duplicate: result.duplicate || false, reason: result.reason || undefined });
}

module.exports = router;
module.exports.receiver = receiver;
