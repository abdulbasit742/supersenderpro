// lib/contentAutopilot/index.js
// Social Content Autopilot orchestrator for SuperSender Pro.
// Pipeline: generate (AI) -> queue -> schedule -> publish (multi-platform).
//
// Design notes:
// - Pure CommonJS, no new dependencies (fs, path, crypto only).
// - AI runs through lib/aiAgent.runPrompt when available; falls back to a
//   deterministic template so generation never hard-crashes.
// - Reuses the existing video-auto-posts/ folder queue
//   (inbox -> queued -> posted/failed). Each job is a JSON file.
// - Publishers are CREDENTIAL-GATED: with no platform token in env they
//   return { ok:false, reason:'no credentials' } and the job is marked
//   'skipped' rather than pretending to post. Nothing here fakes a publish.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- AI hook (graceful) -----------------------------------------------------
let aiAgent = null;
try { aiAgent = require('../aiAgent'); } catch (e) { aiAgent = null; }

// --- queue storage ----------------------------------------------------------
const ROOT = path.join(__dirname, '..', '..', 'video-auto-posts');
const FOLDERS = ['inbox', 'queued', 'generated', 'posted', 'failed'];
const SUPPORTED_PLATFORMS = ['youtube', 'instagram', 'facebook', 'tiktok', 'linkedin', 'whatsapp'];

function ensureFolders() {
  for (const f of FOLDERS) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
}

function jobPath(status, id) {
  return path.join(ROOT, status, `${id}.json`);
}

function readJob(status, id) {
  try { return JSON.parse(fs.readFileSync(jobPath(status, id), 'utf8')); }
  catch (e) { return null; }
}

function writeJob(status, job) {
  ensureFolders();
  fs.writeFileSync(jobPath(status, job.id), JSON.stringify(job, null, 2), 'utf8');
  return job;
}

function moveJob(fromStatus, toStatus, job) {
  try { fs.unlinkSync(jobPath(fromStatus, job.id)); } catch (e) { /* ignore */ }
  job.status = toStatus;
  job.updatedAt = new Date().toISOString();
  return writeJob(toStatus, job);
}

function listJobs(status) {
  ensureFolders();
  const dir = path.join(ROOT, status);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return null; } })
    .filter(Boolean);
}

// --- generation -------------------------------------------------------------
function fallbackContent(topic, platform, tone) {
  const t = (tone || 'friendly');
  return {
    caption: `${topic}`.trim(),
    body: `Here's something on "${topic}" — shared in a ${t} tone. (AI hub unavailable, template used.)`,
    hashtags: ['#' + String(topic).replace(/[^a-z0-9]+/gi, '').slice(0, 24).toLowerCase(), '#supersender'],
    platform,
  };
}

async function aiContent(topic, platform, tone) {
  if (!aiAgent || typeof aiAgent.runPrompt !== 'function') return fallbackContent(topic, platform, tone);
  const prompt = [
    `You are a social media copywriter. Create a ${platform} post about: "${topic}".`,
    `Tone: ${tone || 'friendly'}.`,
    `Return strict JSON with keys: caption (string, <=120 chars), body (string), hashtags (array of 3-6 strings starting with #).`,
    `No commentary, JSON only.`,
  ].join(' ');
  try {
    const raw = await aiAgent.runPrompt(prompt);
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        caption: parsed.caption || topic,
        body: parsed.body || '',
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        platform,
      };
    }
    return { caption: topic, body: String(raw).trim(), hashtags: [], platform };
  } catch (e) {
    return fallbackContent(topic, platform, tone);
  }
}

// Create one job per requested platform, drop into the queued/ folder.
async function generateContent({ topic, platforms, tone, mediaPath, scheduledAt } = {}) {
  if (!topic || !String(topic).trim()) throw new Error('topic is required');
  const targets = (Array.isArray(platforms) && platforms.length ? platforms : ['instagram'])
    .map((p) => String(p).toLowerCase())
    .filter((p) => SUPPORTED_PLATFORMS.includes(p));
  if (!targets.length) throw new Error('no supported platforms (use: ' + SUPPORTED_PLATFORMS.join(', ') + ')');

  const created = [];
  for (const platform of targets) {
    const content = await aiContent(topic, platform, tone);
    const job = {
      id: crypto.randomBytes(8).toString('hex'),
      topic,
      platform,
      tone: tone || 'friendly',
      content,
      mediaPath: mediaPath || null,
      status: 'queued',
      scheduledAt: scheduledAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
    };
    writeJob('queued', job);
    created.push(job);
  }
  return created;
}

// --- scheduling -------------------------------------------------------------
function scheduleJob(id, whenISO) {
  const job = readJob('queued', id);
  if (!job) throw new Error('queued job not found: ' + id);
  job.scheduledAt = whenISO || new Date().toISOString();
  job.updatedAt = new Date().toISOString();
  return writeJob('queued', job);
}

function isDue(job, now) {
  if (!job.scheduledAt) return true; // no schedule = publish on next run
  return new Date(job.scheduledAt).getTime() <= now;
}

// --- publishers (credential-gated, no fake posting) -------------------------
const publishers = {
  youtube: (job) => credEnvPublish(job, ['YOUTUBE_ACCESS_TOKEN'], 'YouTube Data API'),
  instagram: (job) => credEnvPublish(job, ['META_ACCESS_TOKEN', 'IG_BUSINESS_ID'], 'Instagram Graph API'),
  facebook: (job) => credEnvPublish(job, ['META_ACCESS_TOKEN', 'FB_PAGE_ID'], 'Facebook Graph API'),
  tiktok: (job) => credEnvPublish(job, ['TIKTOK_ACCESS_TOKEN'], 'TikTok Content Posting API'),
  linkedin: (job) => credEnvPublish(job, ['LINKEDIN_ACCESS_TOKEN'], 'LinkedIn Posts API'),
  whatsapp: (job) => credEnvPublish(job, ['WATI_API_KEY'], 'WhatsApp (reuse SuperSender WATI)'),
};

// Honest gate: if creds are missing we DO NOT post. We return a structured
// 'skipped' so the operator knows exactly which env var to set. Real HTTP
// posting is intentionally left as a clearly-marked TODO so nothing here
// silently claims a successful publish it did not perform.
function credEnvPublish(job, requiredEnv, apiLabel) {
  const missing = requiredEnv.filter((k) => !process.env[k]);
  if (missing.length) {
    return { ok: false, skipped: true, reason: 'no credentials', missingEnv: missing, api: apiLabel };
  }
  // TODO(real-post): implement the actual API call for `${apiLabel}` here.
  // Credentials are present but the live HTTP call is not yet implemented,
  // so we report not-implemented rather than faking success.
  return { ok: false, skipped: true, reason: 'publisher not implemented', api: apiLabel };
}

// Publish all due jobs in queued/. Moves to posted/ on ok, failed/ otherwise.
async function publishDue() {
  const now = Date.now();
  const due = listJobs('queued').filter((j) => isDue(j, now));
  const results = [];
  for (const job of due) {
    const pub = publishers[job.platform];
    let result;
    try {
      result = pub ? await pub(job) : { ok: false, reason: 'no publisher for ' + job.platform };
    } catch (e) {
      result = { ok: false, reason: e.message };
    }
    job.result = result;
    moveJob('queued', result.ok ? 'posted' : 'failed', job);
    results.push({ id: job.id, platform: job.platform, result });
  }
  return { ran: results.length, results };
}

function status() {
  const counts = {};
  for (const f of FOLDERS) counts[f] = listJobs(f).length;
  return { counts, supportedPlatforms: SUPPORTED_PLATFORMS, aiAvailable: !!(aiAgent && aiAgent.runPrompt) };
}

module.exports = {
  generateContent,
  listJobs,
  scheduleJob,
  publishDue,
  status,
  SUPPORTED_PLATFORMS,
};
