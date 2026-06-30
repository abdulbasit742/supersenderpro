// lib/videoAI/providers/mockProvider.js — The default, fully offline video provider.
// Produces deterministic dry-run previews. NEVER touches the network or filesystem.

function clampDuration(sec) {
 const n = Number(sec || 0);
 if (!n || n < 1) return 8;
 return Math.min(60, Math.round(n));
}

async function generate({ prompt, resolution, durationSec, imageUrl } = {}) {
 return {
 ok: true,
 dryRun: true,
 provider: 'mock_dry_run',
 videoUrl: null,
 videoFilePath: null,
 durationSec: clampDuration(durationSec),
 resolution: resolution || '720p',
 promptPreview: String(prompt || '').slice(0, 160),
 meta: { imageUrl: imageUrl || null, simulated: true },
 };
}

module.exports = { generate, clampDuration };
