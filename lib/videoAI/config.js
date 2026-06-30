// lib/videoAI/config.js — Central, safe configuration for the Video AI module.
// Mirrors lib/voiceAI/config.js. DRY-RUN and approval-protected by default. No external
// or local generator is ever called unless the matching env flag is explicitly "true".
// Never prints or returns secret values.

const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
 if (v === undefined || v === null || v === '') return def;
 return String(v).trim().toLowerCase() === 'true';
}

function resolveDataPath(envVal, fallbackRel) {
 const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
 if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) {
 return path.join(ROOT, fallbackRel);
 }
 return path.join(ROOT, val);
}

const config = {
 enabled: bool(process.env.VIDEO_AI_ENABLED, true),
 dryRun: bool(process.env.VIDEO_AI_DRY_RUN, true),
 requireApproval: bool(process.env.VIDEO_AI_REQUIRE_APPROVAL, true),

 allowLiveGenerate: bool(process.env.VIDEO_AI_ALLOW_LIVE_GENERATE, false),
 allowLiveSend: bool(process.env.VIDEO_AI_ALLOW_LIVE_SEND, false),

 storeVideo: bool(process.env.VIDEO_AI_STORE_VIDEO, false),

 defaultProvider: process.env.VIDEO_AI_DEFAULT_PROVIDER || 'mock_dry_run',
 defaultResolution: process.env.VIDEO_AI_DEFAULT_RESOLUTION || '720p',
 defaultDurationSec: Number(process.env.VIDEO_AI_DEFAULT_DURATION_SEC || 8),

 maxQueue: Number(process.env.VIDEO_AI_MAX_QUEUE || 200),
 cleanupDays: Number(process.env.VIDEO_AI_CLEANUP_DAYS || 7),

 paths: {
 dataDir: DATA_DIR,
 videoStore: resolveDataPath(process.env.VIDEO_AI_VIDEO_STORE_PATH, 'data/video-ai-output'),
 store: resolveDataPath(process.env.VIDEO_AI_STORE_PATH, 'data/video-ai.json'),
 queue: resolveDataPath(process.env.VIDEO_AI_QUEUE_PATH, 'data/video-ai-queue.json'),
 history: resolveDataPath(process.env.VIDEO_AI_HISTORY_PATH, 'data/video-ai-history.json'),
 },
};

// Effective flags: the global dryRun master switch wins unless live is explicitly allowed.
config.effective = {
 liveGenerate: config.enabled && config.allowLiveGenerate && !config.dryRun,
 liveSend: config.enabled && config.allowLiveSend && !config.dryRun,
};

function hasEnvKeys(keys) {
 if (!Array.isArray(keys) || keys.length === 0) return true;
 return keys.every((k) => !!(process.env[k] && String(process.env[k]).trim()));
}

module.exports = { config, bool, hasEnvKeys, ROOT, DATA_DIR };
