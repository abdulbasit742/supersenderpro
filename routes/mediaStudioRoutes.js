// routes/mediaStudioRoutes.js
// Self-mountable Express router for the AI Media Studio.
// Mount in server.js with a single line:
//     app.use('/api/media-studio', require('./routes/mediaStudioRoutes'));

const express = require('express');
const fs = require('fs');
const router = express.Router();
const studio = require('../lib/mediaStudio/mediaStudio');

// POST /api/media-studio/generate
// Body: { storeId?, prompt?, type?('product'|'marketing'|'sticker'), product?{name,description}, steps?, width?, height? }
router.post('/generate', async (req, res) => {
  try {
    const result = await studio.generate(req.body || {});
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/media-studio/jobs?storeId=...&limit=50
router.get('/jobs', (req, res) => {
  try {
    const { storeId, limit } = req.query;
    res.json({ success: true, jobs: studio.listJobs({ storeId, limit: limit ? parseInt(limit, 10) : 50 }) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/media-studio/jobs/:id
router.get('/jobs/:id', (req, res) => {
  const job = studio.getJob(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'job not found' });
  res.json({ success: true, job });
});

// GET /api/media-studio/file/:name  (serves the generated image)
router.get('/file/:name', (req, res) => {
  const p = studio.filePath(req.params.name);
  if (!p) return res.status(404).json({ success: false, error: 'file not found' });
  const mime = p.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  res.setHeader('Content-Type', mime);
  fs.createReadStream(p).pipe(res);
});

// GET /api/media-studio/health
router.get('/health', async (req, res) => {
  try {
    res.json({ success: true, ...(await studio.health()) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
