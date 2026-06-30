// lib/videoAI/providerConfig.js — Static capability + env-key map for video generators.
// NO secrets here, only the NAMES of env vars to look for.

module.exports = {
 mock_dry_run: {
 id: 'mock_dry_run', label: 'Mock (Dry-Run)',
 capabilities: ['text_to_video', 'image_to_video', 'short_video_generation'],
 requiresApiKey: false, envKeys: [],
 selfHosted: false, riskLevel: 'none',
 notes: 'Default safe provider. Never calls anything. Returns deterministic preview metadata.',
 },
 local_video: {
 id: 'local_video', label: 'Local Video (Self-Hosted \u2022 WanGP/ComfyUI/MoneyPrinterTurbo)',
 capabilities: ['text_to_video', 'image_to_video', 'short_video_generation'],
 requiresApiKey: false, envKeys: [],
 selfHosted: true, riskLevel: 'low',
 notes: 'Self-hosted on your own GPU (PC #2). Unlimited, zero cost, on-prem, no API key. '
 + 'Talks to a local WanGP/ComfyUI/MoneyPrinterTurbo HTTP server (LOCAL_VIDEO_URL, '
 + 'default http://127.0.0.1:8002). Set VIDEO_AI_ALLOW_LIVE_GENERATE=true + '
 + 'VIDEO_AI_DRY_RUN=false to go live; otherwise behaves like mock.',
 },
};
