// routes/voiceTranscribeRoutes.js — Voice #1: inbound voice note understanding.
//
// Wire-up (server.js) — STT via local Whisper on PC #2 (zero cloud), route into the inbound pipeline:
//   const voice = require('./lib/voice/voiceAI');
//   voice.setSTT(async (audioRef) => transcribeWithLocalWhisper(audioRef)); // your PC #2 endpoint
//   voice.setInboundHandler((m) => require('./lib/inbound/messageRouter').handleInbound(m));
//   voice.setLangDetect((t) => require('./lib/i18n/localization').detectLang(t));
//   app.use('/api/voice', require('./routes/voiceTranscribeRoutes'));
//
// In the inbound handler, when a message is a voice note, call POST /api/voice/handle with its audio.

const express = require('express');
const router = express.Router();

let voice;
try { voice = require('../lib/voice/voiceAI'); } catch { voice = null; }

function ensure(res) {
  if (!voice) { res.status(503).json({ ok: false, error: 'Voice AI not available' }); return false; }
  return true;
}

// Handle a voice note. Body: { phone, audioRef, name?, lang? }
router.post('/handle', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...(await voice.handleVoiceNote(req.body || {})) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Recent transcripts (debug/inbox).
router.get('/transcripts', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, transcripts: voice.recentTranscripts(Number(req.query.limit) || 50) });
});

module.exports = router;
