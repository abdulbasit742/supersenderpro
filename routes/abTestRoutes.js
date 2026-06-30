// routes/abTestRoutes.js
// Self-mountable Express router for the AI A/B testing engine.
// Mount in server.js with a single line:
//     app.use('/api/ab-test', require('./routes/abTestRoutes'));

const express = require('express');
const router = express.Router();
const ab = require('../lib/abTest/abTest');

// POST /api/ab-test/create   Body: { storeId?, id, name?, variants:[{id?,label,content?}], goal?, minSamplePerVariant?, confidenceThreshold? }
router.post('/create', (req, res) => {
  try {
    const { storeId = 'default_store', id, name, variants, goal, minSamplePerVariant, confidenceThreshold } = req.body || {};
    if (!id || !Array.isArray(variants)) return res.status(400).json({ success: false, error: 'id and variants[] are required' });
    const r = ab.create({ storeId, id, name, variants, goal, minSamplePerVariant, confidenceThreshold });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/ab-test/assign?storeId=&id=&contact=
router.get('/assign', (req, res) => {
  try {
    const { storeId = 'default_store', id, contact } = req.query;
    if (!id || !contact) return res.status(400).json({ success: false, error: 'id and contact are required' });
    const r = ab.assign({ storeId, id, contact });
    res.status(r.ok ? 200 : 404).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/ab-test/impression   Body: { storeId?, id, variantId, count? }
router.post('/impression', (req, res) => {
  try { const { storeId = 'default_store', id, variantId, count } = req.body || {}; const r = ab.recordImpression({ storeId, id, variantId, count }); res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/ab-test/convert   Body: { storeId?, id, variantId, count? }
router.post('/convert', (req, res) => {
  try { const { storeId = 'default_store', id, variantId, count } = req.body || {}; const r = ab.recordConversion({ storeId, id, variantId, count }); res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/ab-test/results?storeId=&id=   (with AI verdict)
router.get('/results', async (req, res) => {
  try {
    const { storeId = 'default_store', id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'id is required' });
    const r = await ab.verdict({ storeId, id });
    res.status(r.ok === false ? 404 : 200).json({ success: r.ok !== false, ...r });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/ab-test/conclude   Body: { storeId?, id, winnerId? }
router.post('/conclude', (req, res) => {
  try { const { storeId = 'default_store', id, winnerId } = req.body || {}; if (!id) return res.status(400).json({ success: false, error: 'id is required' }); const r = ab.conclude({ storeId, id, winnerId }); res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/ab-test/list?storeId=&status=
router.get('/list', (req, res) => {
  try { const { storeId = 'default_store', status } = req.query; res.json({ success: true, experiments: ab.listExperiments({ storeId, status }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/ab-test/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...ab.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
