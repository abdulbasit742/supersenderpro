// routes/visionSearchRoutes.js
// Self-mountable Express router for image product search.
// Mount in server.js with a single line:
//     app.use('/api/vision-search', require('./routes/visionSearchRoutes'));
//
// Accepts an image as: multipart field `image`, JSON { imageBase64 }, or { path }.

const express = require('express');
const fs = require('fs');
const router = express.Router();
const vision = require('../lib/visionSearch/visionSearch');

let upload = null;
try {
  const multer = require('multer');
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
} catch { /* multipart unavailable; base64/path still work */ }

function resolveBuffer(req) {
  if (req.file && req.file.buffer) return req.file.buffer;
  const body = req.body || {};
  if (body.imageBase64) return Buffer.from(String(body.imageBase64).replace(/^data:[^;]+;base64,/, ''), 'base64');
  if (body.path && fs.existsSync(body.path)) return fs.readFileSync(body.path);
  return null;
}

const multipart = upload ? upload.single('image') : (req, res, next) => next();

// POST /api/vision-search/search   (image + optional hint) -> matches
router.post('/search', multipart, async (req, res) => {
  try {
    const buffer = resolveBuffer(req);
    const body = req.body || {};
    if (!buffer && !body.hint) return res.status(400).json({ success: false, error: 'provide an image (multipart `image`, imageBase64, or path) or a text hint' });
    const result = await vision.searchByImage({
      storeId: body.storeId || 'default_store',
      buffer, hint: body.hint || '', phone: body.phone,
      k: body.k ? parseInt(body.k, 10) : 4
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vision-search/describe   (image) -> structured tags only
router.post('/describe', multipart, async (req, res) => {
  try {
    const buffer = resolveBuffer(req);
    if (!buffer) return res.status(400).json({ success: false, error: 'no image provided' });
    res.json({ success: true, description: await vision.describeImage(buffer) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/vision-search/health
router.get('/health', async (req, res) => {
  try { res.json({ success: true, ...(await vision.health()) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
