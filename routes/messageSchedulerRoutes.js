// routes/messageSchedulerRoutes.js — REST surface for Message Scheduler. Mount at /api/message-scheduler.

const express = require('express');
const router = express.Router();

let ms = null; try { ms = require('../lib/messageScheduler'); } catch (e) { ms = null; }
function guard(req, res) { if (!ms) { res.status(503).json({ ok: false, error: 'message scheduler not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!ms) return res.json({ ok: false, error: 'message scheduler not loaded' });
 const r = ms.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(ms.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...ms.jobEngine.overview() }); });

// Jobs
router.post('/jobs', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, job: ms.jobEngine.schedule(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/jobs', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ms.jobEngine.list({ status: req.query.status, type: req.query.type, limit: Number(req.query.limit) || 100 }) }); });
router.get('/jobs/:id', (req, res) => { if (!guard(req, res)) return; const j = ms.jobEngine.get(req.params.id); if (!j) return res.status(404).json({ ok: false, error: 'job not found' }); res.json({ ok: true, job: j, runs: ms.jobEngine.runsFor(req.params.id) }); });
router.post('/jobs/:id/pause', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, job: ms.jobEngine.pause(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/jobs/:id/resume', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, job: ms.jobEngine.resume(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/jobs/:id/cancel', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, job: ms.jobEngine.cancel(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Fire due jobs (wire to node-cron, or call manually/admin).
router.post('/tick', async (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...(await ms.jobEngine.tick()) }); });

// Helper: validate/preview a cron expression's next runs.
router.post('/cron/preview', (req, res) => {
 if (!guard(req, res)) return;
 const { expr, timezone, count } = req.body || {};
 if (!ms.cron.isValid(expr)) return res.status(400).json({ ok: false, error: 'invalid cron expression' });
 const tzName = timezone || ms.config.defaultTimezone; const runs = []; let from = Date.now();
 for (let i = 0; i < (Number(count) || 5); i++) { const next = ms.cron.nextRun(expr, from, tzName); if (!next) break; runs.push(next); from = Date.parse(next); }
 res.json({ ok: true, timezone: tzName, runs });
});

router.setNotifier = (fn) => (ms ? ms.notify.setNotifier(fn) : false);

module.exports = router;
