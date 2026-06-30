// routes/voiceNoteRoutes.js
// Self-mountable Express router for WhatsApp voice-note AI.
// Mount in server.js with a single line:
//     app.use('/api/voice-note', require('./routes/voiceNoteRoutes'));
//
// Accepts audio three ways so it fits any inbound path:
//   1. multipart/form-data field `audio` (uses multer if already a dependency)
//   2. JSON  { audioBase64, phone, ... }
//   3. JSON  { path, phone, ... }   (server-local file path, e.g. a downloaded note)

const express = require('express');
const fs = require('fs');
const router = express.Router();
const voice = require('../lib/voiceNoteAI/voiceNoteAI');

// multer is already in package.json; load best-effort for multipart uploads.
let upload = null;
try {
  const multer = require('multer');
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
} catch { /* multipart simply won't be available */ }

function resolveBuffer(req) {
  if (req.file && req.file.buffer) return { buffer: req.file.buffer, filename: req.file.originalname || 'voice.ogg' };
  const body = req.body || {};
  if (body.audioBase64) {
    const b64 = String(body.audioBase64).replace(/^data:[^;]+;base64,/, '');
    return { buffer: Buffer.from(b64, 'base64'), filename: body.filename || 'voice.ogg' };
  }
  if (body.path && fs.existsSync(body.path)) {
    return { buffer: fs.readFileSync(body.path), filename: body.path.split(/[\\/]/).pop() };
  }
  return { buffer: null, filename: 'voice.ogg' };
}

const multipart = upload ? upload.single('audio') : (req, res, next) => next();

// POST /api/voice-note/transcribe  -> transcript only
router.post('/transcribe', multipart, async (req, res) => {
  try {
    const { buffer, filename } = resolveBuffer(req);
    if (!buffer) return res.status(400).json({ success: false, error: 'no audio provided (use multipart `audio`, audioBase64, or path)' });
    const language = (req.body && req.body.language) || undefined;
    res.json({ success: true, ...(await voice.transcribe(buffer, { filename, language })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/voice-note/handle  -> transcribe + agent reply
router.post('/handle', multipart, async (req, res) => {
  try {
    const { buffer, filename } = resolveBuffer(req);
    if (!buffer) return res.status(400).json({ success: false, error: 'no audio provided' });
    const body = req.body || {};
    if (!body.phone) return res.status(400).json({ success: false, error: 'phone is required' });
    const result = await voice.handleVoiceNote({
      buffer, filename,
      phone: body.phone,
      storeId: body.storeId || 'default_store',
      language: body.language || undefined,
      reply: body.reply === undefined ? true : (body.reply === true || body.reply === 'true')
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/voice-note/jobs?storeId=&phone=&limit=
router.get('/jobs', (req, res) => {
  try {
    const { storeId, phone, limit } = req.query;
    res.json({ success: true, jobs: voice.listJobs({ storeId, phone, limit: limit ? parseInt(limit, 10) : 50 }) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/voice-note/jobs/:id
router.get('/jobs/:id', (req, res) => {
  const job = voice.getJob(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'job not found' });
  res.json({ success: true, job });
});

// GET /api/voice-note/health
router.get('/health', async (req, res) => {
  try { res.json({ success: true, ...(await voice.health()) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
