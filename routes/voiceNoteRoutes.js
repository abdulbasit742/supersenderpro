// routes/voiceNoteRoutes.js — Voice #1: voice-note AI.
//
// Wire-up (server.js) — point STT at local Whisper on PC #2, route to the message router:
//   const voice = require('./lib/voice/voiceNoteAI');
//   voice.setSTT(async ({ url, path, language }) => transcribeWithLocalWhisper({ url, path, language }));
//   voice.setHandler((m) => require('./lib/inbound/messageRouter').handleInbound(m));
//   app.use('/api/voice', require('./routes/voiceNoteRoutes'));
//
// In the inbound handler, when a message is an audio/voice type, call /api/voice/handle (or the
// module directly) with the audio reference instead of treating it as '[audio]'.

const express = require('express');
const router = express.Router();

let voice;
try { voice = require('../lib/voice/voiceNoteAI'); } catch { voice = null; }

function ensure(res) {
  if (!voice) { res.status(503).json({ ok: false, error: 'Voice AI not available' }); return false; }
  return true;
}

// Transcribe only. Body: { audioId, url?, path?, language? }
router.post('/transcribe', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...(await voice.transcribe(req.body || {})) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Full handle: transcribe + route as a message. Body: { phone, name?, audioId, url?, path?, language? }
router.post('/handle', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...(await voice.handleVoiceNote(req.body || {})) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
