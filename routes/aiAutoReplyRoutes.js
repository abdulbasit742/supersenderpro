// routes/aiAutoReplyRoutes.js — REST surface for AI Auto-Reply. Mount at /api/ai-auto-reply.

const express = require('express');
const router = express.Router();

let ar = null; try { ar = require('../lib/aiAutoReply'); } catch (e) { ar = null; }
function guard(req, res) { if (!ar) { res.status(503).json({ ok: false, error: 'ai auto-reply not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!ar) return res.json({ ok: false, error: 'ai auto-reply not loaded' });
 const r = ar.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(ar.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...ar.responder.overview() }); });

// Handle an inbound message (call from the WhatsApp inbound handler). Returns the decision + draft.
router.post('/handle', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, result: await ar.responder.handle(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// FAQ knowledge base
router.get('/faqs', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ar.faqStore.list() }); });
router.post('/faqs', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, faq: ar.faqStore.upsert(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.delete('/faqs/:id', (req, res) => { if (!guard(req, res)) return; ar.faqStore.remove(req.params.id); res.json({ ok: true }); });

router.get('/recent', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ar.responder.recent(Number(req.query.limit) || 100) }); });

router.setNotifier = (fn) => (ar ? ar.notify.setNotifier(fn) : false);

module.exports = router;
