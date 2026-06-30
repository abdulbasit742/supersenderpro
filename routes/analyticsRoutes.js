// routes/analyticsRoutes.js — REST surface for Analytics & Reporting. Mount at /api/analytics.

const express = require('express');
const router = express.Router();

let an = null; try { an = require('../lib/analytics'); } catch (e) { an = null; }
function guard(req, res) { if (!an) { res.status(503).json({ ok: false, error: 'analytics not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!an) return res.json({ ok: false, error: 'analytics not loaded' });
 const r = an.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(an.doctor.run()); });

// Record an event (call from anywhere: track({ event, value, dimensions })).
router.post('/track', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, event: an.track(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.get('/kpi', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, snapshot: an.kpiSnapshot.snapshot() }); });

router.get('/timeseries', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, series: an.rollups.timeSeries(an.eventTracker.all(), { event: req.query.event, period: req.query.period || 'day' }) }); });
router.get('/breakdown', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, breakdown: an.rollups.breakdown(an.eventTracker.all(), { event: req.query.event, dimension: req.query.dimension }) }); });
router.get('/totals', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, totals: an.rollups.totals(an.eventTracker.all(), { event: req.query.event }) }); });

router.post('/funnel', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, funnel: an.funnel.analyze(an.eventTracker.all(), req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.get('/export.csv', (req, res) => {
 if (!guard(req, res)) return;
 const csv = an.csvExport.eventsCSV(req.query.event ? an.eventTracker.forEvent(req.query.event) : an.eventTracker.all());
 res.setHeader('Content-Type', 'text/csv; charset=utf-8');
 res.setHeader('Content-Disposition', 'attachment; filename="analytics-events.csv"');
 res.send(csv);
});

router.get('/digests', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: an.digestBuilder.list(Number(req.query.limit) || 30) }); });
router.post('/digests/run', async (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...(await an.digestBuilder.run(req.body || {})) }); });

router.setNotifier = (fn) => (an ? an.notify.setNotifier(fn) : false);

module.exports = router;
