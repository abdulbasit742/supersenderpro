// routes/orchestratorRoutes.js
// Self-mountable Express router for the AI inbound orchestrator.
// Mount in server.js with a single line:
//     app.use('/api/orchestrator', require('./routes/orchestratorRoutes'));
//
// Accepts: JSON { phone, text } and/or audio/image via multipart (audio,image)
// or base64 (audioBase64, imageBase64).

const express = require('express');
const router = express.Router();
const orch = require('../lib/inboundOrchestrator/orchestrator');

let upload = null;
try {
  const multer = require('multer');
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
} catch { /* multipart optional */ }

function bufFrom(req, fileField, b64Field) {
  if (req.files && req.files[fileField] && req.files[fileField][0]) return req.files[fileField][0].buffer;
  const body = req.body || {};
  if (body[b64Field]) return Buffer.from(String(body[b64Field]).replace(/^data:[^;]+;base64,/, ''), 'base64');
  return undefined;
}

const fields = upload ? upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'image', maxCount: 1 }]) : (req, res, next) => next();

// POST /api/orchestrator/handle
router.post('/handle', fields, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.phone) return res.status(400).json({ success: false, error: 'phone is required' });
    const result = await orch.handleInbound({
      storeId: body.storeId || 'default_store',
      phone: body.phone,
      text: body.text || '',
      audioBuffer: bufFrom(req, 'audio', 'audioBase64'),
      imageBuffer: bufFrom(req, 'image', 'imageBase64'),
      wantVoiceReply: body.wantVoiceReply === undefined ? undefined : (body.wantVoiceReply === true || body.wantVoiceReply === 'true'),
      useAIModeration: body.useAIModeration === true || body.useAIModeration === 'true'
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orchestrator/runs?storeId=&phone=&limit=
router.get('/runs', (req, res) => {
  try {
    const { storeId, phone, limit } = req.query;
    res.json({ success: true, runs: orch.listRuns({ storeId, phone, limit: limit ? parseInt(limit, 10) : 50 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/orchestrator/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...orch.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
