// routes/schedulerRoutes.js
// Self-mountable Express router for the recurring campaign scheduler.
// Mount in server.js with a single line:
//     app.use('/api/scheduler', require('./routes/schedulerRoutes'));

const express = require('express');
const router = express.Router();
const sch = require('../lib/scheduler/recurringScheduler');

// POST /api/scheduler/create
// Body: { storeId?, id, name?, freq, time, days?, dayOfMonth?, onceAtISO?, timezone?, message?, segment?, autoGenerateGoal?, maxRuns? }
router.post('/create', (req, res) => {
  try { res.json({ success: true, schedule: sch.create({ storeId: 'default_store', ...(req.body || {}) }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/scheduler/list?storeId=&status=
router.get('/list', (req, res) => {
  try { const { storeId = 'default_store', status } = req.query; res.json({ success: true, schedules: sch.listSchedules({ storeId, status }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/scheduler/preview?storeId=&id=&count=
router.get('/preview', (req, res) => {
  try { const { storeId = 'default_store', id, count } = req.query; if (!id) return res.status(400).json({ success: false, error: 'id is required' }); res.json({ success: true, ...sch.preview({ storeId, id, count: count ? parseInt(count, 10) : 5 }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/scheduler/due?storeId=
router.get('/due', (req, res) => {
  try { res.json({ success: true, due: sch.due({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/scheduler/ran   Body: { storeId?, id }
router.post('/ran', async (req, res) => {
  try { const { storeId = 'default_store', id } = req.body || {}; if (!id) return res.status(400).json({ success: false, error: 'id is required' }); res.json({ success: true, ...(await sch.markRan({ storeId, id })) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/scheduler/pause | /resume   Body: { storeId?, id }
router.post('/pause', (req, res) => { try { const { storeId = 'default_store', id } = req.body || {}; res.json({ success: true, ...sch.pause({ storeId, id }) }); } catch (err) { res.status(400).json({ success: false, error: err.message }); } });
router.post('/resume', (req, res) => { try { const { storeId = 'default_store', id } = req.body || {}; res.json({ success: true, ...sch.resume({ storeId, id }) }); } catch (err) { res.status(400).json({ success: false, error: err.message }); } });

// DELETE /api/scheduler/:id?storeId=
router.delete('/:id', (req, res) => {
  try { res.json({ success: true, ...sch.deleteSchedule({ storeId: req.query.storeId || 'default_store', id: req.params.id }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/scheduler/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...sch.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
