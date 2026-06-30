// routes/senderHealthRoutes.js — REST surface for Sender Health & Anti-Ban. Mount at /api/sender-health.

const express = require('express');
const router = express.Router();

let sh = null; try { sh = require('../lib/senderHealth'); } catch (e) { sh = null; }
function guard(req, res) { if (!sh) { res.status(503).json({ ok: false, error: 'sender health not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!sh) return res.json({ ok: false, error: 'sender health not loaded' });
 const r = sh.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(sh.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...sh.governor.overview() }); });

// Ask whether a number may send now (advisory). Body/query: { number }
router.get('/gate', (req, res) => { if (!guard(req, res)) return; const number = req.query.number; if (!number) return res.status(400).json({ ok: false, error: 'number is required' }); res.json({ ok: true, ...sh.governor.gate(number) }); });

// Record outcomes so counters + score stay accurate.
router.post('/sent', (req, res) => { if (!guard(req, res)) return; const n = (req.body || {}).number; if (!n) return res.status(400).json({ ok: false, error: 'number is required' }); res.json({ ok: true, number: sh.numberRegistry.publicView(sh.numberRegistry.recordSend(n)) }); });
router.post('/block', (req, res) => { if (!guard(req, res)) return; const n = (req.body || {}).number; if (!n) return res.status(400).json({ ok: false, error: 'number is required' }); res.json({ ok: true, number: sh.numberRegistry.publicView(sh.numberRegistry.recordBlock(n, Number((req.body || {}).count) || 1)) }); });
router.post('/complaint', (req, res) => { if (!guard(req, res)) return; const n = (req.body || {}).number; if (!n) return res.status(400).json({ ok: false, error: 'number is required' }); res.json({ ok: true, number: sh.numberRegistry.publicView(sh.numberRegistry.recordComplaint(n, Number((req.body || {}).count) || 1)) }); });
router.post('/status-set', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (!b.number || !b.status) return res.status(400).json({ ok: false, error: 'number and status required' }); res.json({ ok: true, number: sh.numberRegistry.publicView(sh.numberRegistry.setStatus(b.number, b.status)) }); });

// Spintax preview: expand a template + count variations.
router.post('/spin/preview', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (b.text === undefined) return res.status(400).json({ ok: false, error: 'text is required' }); res.json({ ok: true, sample: sh.spintax.spin(b.text), variations: sh.spintax.count(b.text) }); });

module.exports = router;
