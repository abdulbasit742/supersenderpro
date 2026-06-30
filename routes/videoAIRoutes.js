// routes/videoAIRoutes.js — Admin/status + dry-run generate endpoints for the Video AI
// module. Mirrors routes/voiceAIRoutes.js conventions. Safe: dry-run by default, no secrets.
//
// Mount in server.js (single line, near the other route mounts):
//   app.use('/api/video-ai', require('./routes/videoAIRoutes'));

'use strict';
const express = require('express');
const router = express.Router();
const video = require('../lib/videoAI');

const ENABLED = String(process.env.VIDEO_AI_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) {
 if (!ENABLED) return res.status(403).json({ ok: false, error: 'Video AI disabled.' });
 next();
}

// Status: lists providers + current dry-run/live flags. No secrets.
router.get('/status', function (req, res) {
 res.json({
 ok: true,
 module: 'video-ai',
 status: 'available',
 enabled: ENABLED,
 dryRun: video.config.dryRun || !video.config.effective.liveGenerate,
 defaultProvider: video.providerRegistry.defaultProvider().id,
 providers: video.providerRegistry.list(),
 timestamp: new Date().toISOString(),
 });
});

router.get('/providers', guard, function (req, res) {
 res.json({ ok: true, providers: video.providerRegistry.list() });
});

// Generate. Honors the global dry-run master switch; live only when explicitly enabled.
router.post('/generate', guard, function (req, res) {
 const b = req.body || {};
 video.videoEngine
 .generate({
 prompt: b.prompt,
 imageUrl: b.imageUrl,
 resolution: b.resolution,
 durationSec: b.durationSec,
 provider: b.provider,
 })
 .then(function (r) { res.json(Object.assign({ ok: true }, r)); })
 .catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});

// Preview = always dry-run.
router.post('/preview', guard, function (req, res) {
 const b = req.body || {};
 video.videoEngine
 .previewOnly({ prompt: b.prompt, imageUrl: b.imageUrl, resolution: b.resolution, durationSec: b.durationSec, provider: b.provider })
 .then(function (r) { res.json(Object.assign({ ok: true }, r)); })
 .catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});

module.exports = router;
