// routes/scheduledReportsRoutes.js — REST surface for Scheduled Reports & Exports.
// Mount at /api/scheduled-reports.

const express = require('express');
const router = express.Router();

let sr = null; try { sr = require('../lib/scheduledReports'); } catch (e) { sr = null; }
function guard(req, res) { if (!sr) { res.status(503).json({ ok: false, error: 'scheduled reports not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!sr) return res.json({ ok: false, error: 'scheduled reports not loaded' });
 const r = sr.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(sr.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...sr.reportEngine.overview() }); });
router.get('/sources', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, sources: sr.SOURCES, formats: sr.FORMATS }); });

router.post('/reports', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, report: sr.reportEngine.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/reports', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: sr.reportEngine.list() }); });
router.get('/reports/:id', (req, res) => { if (!guard(req, res)) return; const r = sr.reportEngine.get(req.params.id); if (!r) return res.status(404).json({ ok: false, error: 'report not found' }); res.json({ ok: true, report: r, runs: sr.reportEngine.runs(req.params.id) }); });
router.post('/reports/:id/active', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, report: sr.reportEngine.setActive(req.params.id, (req.body || {}).active) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Run now (builds + archives + draft-delivers).
router.post('/reports/:id/run', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await sr.reportEngine.run(req.params.id)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
// Run all due scheduled reports (wire to node-cron).
router.post('/run-due', async (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...(await sr.reportEngine.runDue()) }); });

router.get('/reports/:id/runs', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: sr.reportEngine.runs(req.params.id, Number(req.query.limit) || 20) }); });
// Download a specific run's content (CSV or JSON).
router.get('/runs/:runId/download', (req, res) => {
 if (!guard(req, res)) return;
 const c = sr.reportEngine.runContent(req.params.runId);
 if (!c) return res.status(404).json({ ok: false, error: 'run not found' });
 if (c.format === 'csv') { res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="${c.attachmentName}"`); return res.send(c.content); }
 res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="${c.attachmentName}"`); res.send(c.content);
});

router.setNotifier = (fn) => (sr ? sr.notify.setNotifier(fn) : false);

module.exports = router;
