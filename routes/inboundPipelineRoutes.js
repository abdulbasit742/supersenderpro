// routes/inboundPipelineRoutes.js
// Self-mountable Express router for the AI Inbound Pipeline — the single
// endpoint the WhatsApp engine calls for every inbound message.
// Mount in server.js with a single line:
//     app.use('/api/inbound', require('./routes/inboundPipelineRoutes'));
//
// Media (voice/image) can be sent as multipart `media`, JSON `mediaBase64`, or
// a server-local `path`.

const express = require('express');
const fs = require('fs');
const router = express.Router();
const pipeline = require('../lib/inboundPipeline/inboundPipeline');

let upload = null;
try {
  const multer = require('multer');
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
} catch { /* multipart unavailable; base64/path still work */ }

function resolveMedia(req) {
  if (req.file && req.file.buffer) return req.file.buffer;
  const body = req.body || {};
  if (body.mediaBase64) return Buffer.from(String(body.mediaBase64).replace(/^data:[^;]+;base64,/, ''), 'base64');
  if (body.path && fs.existsSync(body.path)) return fs.readFileSync(body.path);
  return null;
}

const multipart = upload ? upload.single('media') : (req, res, next) => next();

// POST /api/inbound/handle
// Body: { storeId?, phone, text?, type?('text'|'voice'|'image'), customerName?, options?, (media|mediaBase64|path) }
router.post('/handle', multipart, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.phone) return res.status(400).json({ success: false, error: 'phone is required' });
    const type = body.type || 'text';
    const media = (type === 'voice' || type === 'image') ? resolveMedia(req) : null;
    let options = body.options || {};
    if (typeof options === 'string') { try { options = JSON.parse(options); } catch { options = {}; } }
    const result = await pipeline.handleInbound({
      storeId: body.storeId || 'default_store',
      phone: body.phone, text: body.text || '', type, media,
      customerName: body.customerName, options
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/inbound/health   (which suite features are wired)
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...pipeline.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
