// routes/salesPipelineRoutes.js — CRM #2: sales pipeline.
//
// Wire-up (server.js):
//   const pipeline = require('./lib/crm/salesPipeline');
//   const c360 = require('./lib/crm/customer360');
//   pipeline.setTimelineRecorder((phone, ev) => c360.recordEvent(phone, ev)); // stage moves on 360
//   app.use('/api/crm/pipeline', require('./routes/salesPipelineRoutes'));

const express = require('express');
const router = express.Router();

let pipeline;
try { pipeline = require('../lib/crm/salesPipeline'); } catch { pipeline = null; }

function ensure(res) {
  if (!pipeline) { res.status(503).json({ ok: false, error: 'Sales pipeline not available' }); return false; }
  return true;
}

// Board view (deals grouped by stage). Put this before /:id so it isn't shadowed.
router.get('/board', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, board: pipeline.board(), forecast: pipeline.forecast() });
});

// Forecast only.
router.get('/forecast', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, forecast: pipeline.forecast() });
});

// List deals. Query: ?stage=&status=&customerPhone=&ownerId=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, deals: pipeline.listDeals(req.query) });
});

// Create a deal. Body: { title, customerPhone?, value?, stage?, ownerId?, expectedCloseAt? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, deal: pipeline.createDeal(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const d = pipeline.getDeal(req.params.id);
  if (!d) return res.status(404).json({ ok: false, error: 'Deal not found' });
  res.json({ ok: true, deal: d });
});

// Move stage. Body: { stage }
router.post('/:id/move', (req, res) => {
  if (!ensure(res)) return;
  try {
    const d = pipeline.moveDeal(req.params.id, (req.body || {}).stage);
    if (!d) return res.status(404).json({ ok: false, error: 'Deal not found' });
    res.json({ ok: true, deal: d });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Update fields. Body: { title?, value?, ownerId?, expectedCloseAt? }
router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  const d = pipeline.updateDeal(req.params.id, req.body || {});
  if (!d) return res.status(404).json({ ok: false, error: 'Deal not found' });
  res.json({ ok: true, deal: d });
});

module.exports = router;
