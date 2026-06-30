// routes/segmentRoutes.js
// Self-mountable Express router for the natural-language segment builder.
// Mount in server.js with a single line:
//     app.use('/api/segments', require('./routes/segmentRoutes'));

const express = require('express');
const router = express.Router();
const seg = require('../lib/segments/segmentBuilder');

// POST /api/segments/build   Body: { text }            (text -> filter, no resolve)
router.post('/build', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...(await seg.build({ text })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/segments/resolve   Body: { storeId?, text?, filter?, limit? }
router.post('/resolve', async (req, res) => {
  try {
    const { storeId = 'default_store', text, filter, limit } = req.body || {};
    if (!text && !filter) return res.status(400).json({ success: false, error: 'text or filter is required' });
    if (text) return res.json({ success: true, ...(await seg.buildAndResolve({ storeId, text, limit: limit || 5000 })) });
    res.json({ success: true, ...seg.resolve({ storeId, filter, limit: limit || 5000 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/segments/save   Body: { storeId?, name, filter, text? }
router.post('/save', (req, res) => {
  try {
    const { storeId = 'default_store', name, filter, text } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    res.json({ success: true, segment: seg.saveSegment({ storeId, name, filter, text }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/segments?storeId=
router.get('/', (req, res) => {
  try { res.json({ success: true, segments: seg.listSegments({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/segments/:name?storeId=
router.delete('/:name', (req, res) => {
  try { res.json({ success: true, ...seg.deleteSegment({ storeId: req.query.storeId || 'default_store', name: req.params.name }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/segments/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...seg.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
