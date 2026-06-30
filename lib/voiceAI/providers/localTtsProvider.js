// lib/voiceAI/providers/localTtsProvider.js — Self-hosted, UNLIMITED TTS adapter.
// Talks to a local GPT-SoVITS / Chatterbox / XTTS HTTP server running on YOUR own GPU
// (PC #1). No API key, no per-character limit, zero cost, fully on-prem.
//
// SAFETY: identical contract to the other providers. It behaves exactly like the mock
// provider (dry-run preview, no network) unless live TTS is explicitly enabled via
// VOICE_AI_ALLOW_LIVE_TTS=true + VOICE_AI_DRY_RUN=false. On any network error it fails
// safe back to the mock preview, so the app never crashes and never blocks.

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { config, ROOT } = require('../config');
const mock = require('./mockProvider');

// A self-hosted server needs NO API key — the URL itself is the only config.
const ENV_KEYS = [];
const DEFAULT_URL = 'http://127.0.0.1:8001';

function baseUrl() {
  return String(process.env.LOCAL_TTS_URL || DEFAULT_URL).replace(/\/+$/, '');
}
function ttsPath() {
  return process.env.LOCAL_TTS_PATH || '/api/tts';
}
// gpt_sovits | chatterbox | xtts | piper ... informational, passed through to the server.
function engineName() {
  return process.env.LOCAL_TTS_ENGINE || 'gpt_sovits';
}
// Local server is keyless → always considered "present".
function keyPresent() {
  return true;
}

function postJson(urlStr, pathPart, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(urlStr);
    } catch (e) {
      return reject(new Error('bad_local_tts_url'));
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
        timeout: timeoutMs || 120000,
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
      reject(new Error('local_tts_timeout'));
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

async function synthesize(args) {
  const { text = '', language, voiceId, tone, speed = 1.0 } = args || {};

  // Safety: behave exactly like mock unless live TTS is explicitly enabled.
  if (!config.effective.liveTTS) {
    const r = await mock.synthesize(args);
    return { ...r, provider: 'local_tts', dryRun: true, note: 'live_tts_disabled' };
  }

  try {
    const res = await postJson(
      baseUrl(),
      ttsPath(),
      {
        text,
        language: language || config.defaultLanguage || 'roman_urdu',
        voice: voiceId || process.env.LOCAL_TTS_VOICE || 'default',
        engine: engineName(),
        speed,
        format: process.env.LOCAL_TTS_FORMAT || 'mp3',
      },
      Number(process.env.LOCAL_TTS_TIMEOUT_MS || 120000)
    );

    if (!res || res.status >= 400 || !res.json) {
      throw new Error('local_tts_http_' + ((res && res.status) || '?'));
    }
    const j = res.json;
    const durationSec =
      Number(j.duration_sec || j.duration || mock.estimateDurationSec(text)) ||
      mock.estimateDurationSec(text);

    let audioFilePath = null;
    let audioUrl = j.audio_url || null;

    // If the server returned raw base64 audio, persist it to the local audio store.
    if (j.audio_base64) {
      const ext = String(j.format || process.env.LOCAL_TTS_FORMAT || 'mp3').replace(/[^a-z0-9]/gi, '') || 'mp3';
      const dir = config.paths.audioStore;
      ensureDir(dir);
      const fname = 'tts-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      const abs = path.join(dir, fname);
      fs.writeFileSync(abs, Buffer.from(j.audio_base64, 'base64'));
      audioFilePath = path.relative(ROOT, abs);
      audioUrl = audioUrl || '/voice-ai-audio/' + fname;
    }

    return {
      ok: true,
      dryRun: false,
      provider: 'local_tts',
      audioUrl,
      audioFilePath,
      estimatedDurationSec: durationSec,
      textPreview: String(text).slice(0, 160),
      meta: {
        language,
        tone,
        voiceId: voiceId || j.voice || 'local-default',
        engine: engineName(),
        selfHosted: true,
        cost: 0,
      },
    };
  } catch (e) {
    // Fail safe → mock preview, tagged with the error note (no crash, no cost).
    return {
      ok: false,
      dryRun: true,
      provider: 'local_tts',
      errors: ['Local TTS server unreachable: ' + (e && e.message) + '. Returning safe dry-run.'],
      ...(await mock.synthesize(args)),
      note: 'local_server_unreachable',
    };
  }
}

module.exports = { synthesize, keyPresent, ENV_KEYS, baseUrl, engineName };
