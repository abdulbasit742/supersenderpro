// lib/videoAI/videoEngine.js — Video generation engine. DRY-RUN by default.
// Contract mirrors voiceAI/ttsEngine: never calls a generator in dry-run; resolves the
// provider; fails safe; returns a normalized result. Approval is required before any send.

const { config } = require('./config');
const providers = require('./providers');
const providerRegistry = require('./providerRegistry');

async function generate(input = {}) {
 const {
 prompt = '',
 imageUrl = null,
 resolution = config.defaultResolution,
 durationSec = config.defaultDurationSec,
 provider = config.defaultProvider,
 dryRun = config.dryRun,
 } = input;

 const warnings = [];
 const errors = [];

 const pInfo = providerRegistry.get(provider) || providerRegistry.defaultProvider();
 const effectiveDryRun = dryRun || !config.effective.liveGenerate;

 const gen = providers.getGenerator(pInfo.id);
 let result;
 try {
 result = await gen({ prompt, imageUrl, resolution, durationSec });
 } catch (e) {
 errors.push('Provider error: ' + e.message);
 result = { ok: false, dryRun: true, provider: pInfo.id, durationSec: 0 };
 }

 const forceDry = effectiveDryRun || errors.length > 0;

 return {
 ok: errors.length === 0,
 dryRun: forceDry,
 provider: pInfo.id,
 selfHosted: !!pInfo.selfHosted,
 videoUrl: forceDry ? null : (result && result.videoUrl) || null,
 videoFilePath: forceDry ? null : (result && result.videoFilePath) || null,
 durationSec: (result && result.durationSec) || 0,
 resolution: (result && result.resolution) || resolution,
 promptPreview: String(prompt).slice(0, 160),
 warnings,
 errors,
 approvalRequired: config.requireApproval,
 };
}

// Preview = always dry-run, no side effects.
async function previewOnly(input = {}) {
 return generate({ ...input, dryRun: true });
}

module.exports = { generate, previewOnly };
