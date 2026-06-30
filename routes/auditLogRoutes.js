// routes/auditLogRoutes.js — REST surface for the Audit Log. Mount at /api/audit-log.
// Read/admin endpoints; sit them behind your existing session/admin auth. There is intentionally
// NO endpoint to edit or delete a record — the trail is append-only.

const express = require('express');
const router = express.Router();

let al = null; try { al = require('../lib/auditLog'); } catch (e) { al = null; }
function guard(req, res) { if (!al) { res.status(503).json({ ok: false, error: 'audit log not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!al) return res.json({ ok: false, error: 'audit log not loaded' });
 const r = al.doctor.run(); res.json({ ok: true, posture: r.posture, integrity: r.integrity, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(al.doctor.run()); });
router.get('/verify', (req, res) => { if (!guard(req, res)) return; const d = al.store.load(); res.json({ ok: true, ...al.hashChain.verify(d.records, d.anchorHash) }); });
router.get('/stats', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...al.query.stats() }); });

router.get('/records', (req, res) => {
 if (!guard(req, res)) return;
 const q = req.query || {};
 res.json({ ok: true, ...al.query.list({ actor: q.actor, action: q.action, target: q.target, status: q.status, since: q.since, until: q.until, limit: Number(q.limit) || 100, offset: Number(q.offset) || 0 }) });
});

// Manually record an event (for app code that prefers HTTP over require()).
router.post('/record', (req, res) => { if (!guard(req, res)) return; try { const rec = al.record(req.body || {}); res.json({ ok: true, record: rec }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.get('/export.csv', (req, res) => {
 if (!guard(req, res)) return;
 const csv = al.query.toCSV({ actor: req.query.actor, action: req.query.action, since: req.query.since, until: req.query.until, limit: Number(req.query.limit) || 10000 });
 res.setHeader('Content-Type', 'text/csv; charset=utf-8');
 res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
 res.send(csv);
});

module.exports = router;
