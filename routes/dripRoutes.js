// routes/dripRoutes.js
// Self-mountable Express router for the AI drip & nurture sequencer.
// Mount in server.js with a single line:
//     app.use('/api/drip', require('./routes/dripRoutes'));

const express = require('express');
const router = express.Router();
const drip = require('../lib/drip/dripSequencer');

// POST /api/drip/define   Body: { storeId?, id, name?, trigger?, steps:[{delayHours,text}] }
router.post('/define', (req, res) => {
  try {
    const { storeId = 'default_store', id, name, trigger, steps } = req.body || {};
    res.json({ success: true, sequence: drip.defineSequence({ storeId, id, name, trigger, steps }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/drip/author   Body: { goal, stepCount?, cadenceHours? }   (AI-write steps; does not save)
router.post('/author', async (req, res) => {
  try {
    const { goal, stepCount, cadenceHours } = req.body || {};
    if (!goal) return res.status(400).json({ success: false, error: 'goal is required' });
    res.json({ success: true, ...(await drip.authorSteps({ goal, stepCount: stepCount || 3, cadenceHours })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/drip/sequences?storeId=
router.get('/sequences', (req, res) => {
  try { res.json({ success: true, sequences: drip.listSequences({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/drip/enroll   Body: { storeId?, phone, sequenceId }
router.post('/enroll', (req, res) => {
  try {
    const { storeId = 'default_store', phone, sequenceId } = req.body || {};
    if (!phone || !sequenceId) return res.status(400).json({ success: false, error: 'phone and sequenceId are required' });
    const r = drip.enroll({ storeId, phone, sequenceId });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/drip/event   Body: { storeId?, phone, event }   (enroll into all sequences for this trigger)
router.post('/event', (req, res) => {
  try {
    const { storeId = 'default_store', phone, event } = req.body || {};
    if (!phone || !event) return res.status(400).json({ success: false, error: 'phone and event are required' });
    res.json({ success: true, ...drip.onEvent({ storeId, phone, event }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/drip/due?storeId=   (steps due now; queue worker sends them)
router.get('/due', (req, res) => {
  try { res.json({ success: true, due: drip.due({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/drip/sent   Body: { storeId?, phone, sequenceId }
router.post('/sent', (req, res) => {
  try {
    const { storeId = 'default_store', phone, sequenceId } = req.body || {};
    if (!phone || !sequenceId) return res.status(400).json({ success: false, error: 'phone and sequenceId are required' });
    res.json({ success: true, ...drip.markStepSent({ storeId, phone, sequenceId }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/drip/stop   Body: { storeId?, phone, sequenceId? }
router.post('/stop', (req, res) => {
  try {
    const { storeId = 'default_store', phone, sequenceId } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, ...drip.stop({ storeId, phone, sequenceId }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/drip/enrollments?storeId=&status=&sequenceId=
router.get('/enrollments', (req, res) => {
  try {
    const { storeId = 'default_store', status, sequenceId } = req.query;
    res.json({ success: true, enrollments: drip.listEnrollments({ storeId, status, sequenceId }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/drip/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...drip.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
