// routes/voiceReplyRoutes.js
// Self-mountable Express router for AI voice replies (TTS).
// Mount in server.js with a single line:
//     app.use('/api/voice-reply', require('./routes/voiceReplyRoutes'));

const express = require('express');
const fs = require('fs');
const router = express.Router();
const voiceReply = require('../lib/voiceReply/voiceReply');

// POST /api/voice-reply/speak
// Body: { storeId?, phone?, text, language?, voice?, force? }
router.post('/speak', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, text, language, voice, force } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    const result = await voiceReply.speak({ storeId, phone, text, language, voice, force: force === true || force === 'true' });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/voice-reply/file/:name  (serves the generated voice note)
router.get('/file/:name', (req, res) => {
  const p = voiceReply.filePath(req.params.name);
  if (!p) return res.status(404).json({ success: false, error: 'file not found' });
  const mime = p.endsWith('.ogg') ? 'audio/ogg' : p.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  fs.createReadStream(p).pipe(res);
});

// GET /api/voice-reply/jobs?storeId=&phone=&limit=
router.get('/jobs', (req, res) => {
  try {
    const { storeId, phone, limit } = req.query;
    res.json({ success: true, jobs: voiceReply.listJobs({ storeId, phone, limit: limit ? parseInt(limit, 10) : 50 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/voice-reply/health
router.get('/health', async (req, res) => {
  try { res.json({ success: true, ...(await voiceReply.health()) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
