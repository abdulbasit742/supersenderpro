// lib/videoAI/providers/localVideoProvider.js — Self-hosted, UNLIMITED video adapter.
// Talks to a local WanGP / ComfyUI / MoneyPrinterTurbo HTTP server on YOUR own GPU
// (PC #2). No API key, no per-clip limit, zero cost, fully on-prem.
//
// SAFETY: behaves exactly like the mock provider (dry-run, no network) unless live
// generation is explicitly enabled via VIDEO_AI_ALLOW_LIVE_GENERATE=true +
// VIDEO_AI_DRY_RUN=false. On any network error it fails safe back to the mock preview.

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { config, ROOT } = require('../config');
const mock = require('./mockProvider');

const ENV_KEYS = []; // keyless local server
const DEFAULT_URL = 'http://127.0.0.1:8002';

function baseUrl() {
 return String(process.env.LOCAL_VIDEO_URL || DEFAULT_URL).replace(/\/+$/, '');
}
function genPath() {
 return process.env.LOCAL_VIDEO_PATH || '/api/generate';
}
// wan | wan2.2 | ltx | hunyuan | comfyui | moneyprinter ... informational, passed through.
function engineName() {
 return process.env.LOCAL_VIDEO_ENGINE || 'wan';
}
function keyPresent() {
 return true;
}

function postJson(urlStr, pathPart, body, timeoutMs) {
 return new Promise((resolve, reject) => {
 let u;
 try {
 u = new URL(urlStr);
 } catch (e) {
 return reject(new Error('bad_local_video_url'));
 }
 const isHttps = u.protocol === 'https:';
 const lib = isHttps ? https : http;
 const payload = JSON.stringify(body || {});
 const req = lib.request(
 {
 hostname: u.hostname,
 port: u.port || (isHttps ? 443 : 80),
 path: pathPart,
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Content-Length': Buffer.byteLength(payload),
 },
 // Video gen is slow — generous default timeout (10 min).
 timeout: timeoutMs || 600000,
 },
 (res) => {
 let data = '';
 res.on('data', (c) => {
 data += c;
 });
 res.on('end', () => {
 let j = null;
 try {
 j = JSON.parse(data || '{}');
 } catch (_e) {}
 resolve({ status: res.statusCode, json: j, raw: data });
 });
 }
 );
 req.on('timeout', () => {
 req.destroy();
 reject(new Error('local_video_timeout'));
 });
 req.on('error', reject);
 req.write(payload);
 req.end();
 });
}

function ensureDir(dir) {
 try {
 fs.mkdirSync(dir, { recursive: true });
 } catch (_e) {}
}

async function generate(args) {
 const { prompt = '', resolution, durationSec, imageUrl } = args || {};

 // Safety: behave exactly like mock unless live generation is explicitly enabled.
 if (!config.effective.liveGenerate) {
 const r = await mock.generate(args);
 return { ...r, provider: 'local_video', dryRun: true, note: 'live_generate_disabled' };
 }

 try {
 const res = await postJson(
 baseUrl(),
 genPath(),
 {
 prompt,
 image_url: imageUrl || null,
 resolution: resolution || config.defaultResolution || '720p',
 duration_sec: mock.clampDuration(durationSec || config.defaultDurationSec),
 engine: engineName(),
 format: process.env.LOCAL_VIDEO_FORMAT || 'mp4',
 },
 Number(process.env.LOCAL_VIDEO_TIMEOUT_MS || 600000)
 );

 if (!res || res.status >= 400 || !res.json) {
 throw new Error('local_video_http_' + ((res && res.status) || '?'));
 }
 const j = res.json;

 let videoFilePath = null;
 let videoUrl = j.video_url || null;

 // If the server returned raw base64 video, persist it to the local video store.
 if (j.video_base64) {
 const ext = String(j.format || process.env.LOCAL_VIDEO_FORMAT || 'mp4').replace(/[^a-z0-9]/gi, '') || 'mp4';
 const dir = config.paths.videoStore;
 ensureDir(dir);
 const fname = 'vid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
 const abs = path.join(dir, fname);
 fs.writeFileSync(abs, Buffer.from(j.video_base64, 'base64'));
 videoFilePath = path.relative(ROOT, abs);
 videoUrl = videoUrl || '/video-ai-output/' + fname;
 }

 return {
 ok: true,
 dryRun: false,
 provider: 'local_video',
 videoUrl,
 videoFilePath,
 durationSec: Number(j.duration_sec || j.duration || mock.clampDuration(durationSec || config.defaultDurationSec)),
 resolution: j.resolution || resolution || config.defaultResolution || '720p',
 promptPreview: String(prompt).slice(0, 160),
 meta: { engine: engineName(), imageUrl: imageUrl || null, selfHosted: true, cost: 0 },
 };
 } catch (e) {
 return {
 ok: false,
 dryRun: true,
 provider: 'local_video',
 errors: ['Local video server unreachable: ' + (e && e.message) + '. Returning safe dry-run.'],
 ...(await mock.generate(args)),
 note: 'local_server_unreachable',
 };
 }
}

module.exports = { generate, keyPresent, ENV_KEYS, baseUrl, engineName };
