// lib/contentAutopilot/videoHook.js
// Pluggable AI video-generation hook for the Content Autopilot.
//
// Purpose: connect your existing GPU video pipeline (ComfyUI /
// MoneyPrinterTurbo / OpenMontage on PC #2) to the autopilot, WITHOUT this
// repo needing to know how the video is made.
//
// Two integration modes (pick what fits your setup):
//
//  A) FOLDER MODE (default, zero-config):
//     Your GPU pipeline writes finished videos into video-auto-posts/inbox/.
//     For each file there, this hook records a pending media asset that you
//     can attach to a queued job via attachMediaToJob(jobId, fileName).
//
//  B) HTTP MODE (optional):
//     If VIDEO_GEN_URL is set, requestVideo(topic) POSTs { topic } to your
//     local generator (e.g. a MoneyPrinterTurbo HTTP wrapper) and expects
//     { mediaUrl } back. Credential/endpoint-gated; no fake generation.
//
// Honesty: this file does NOT generate video itself. It is glue. It has not
// been run end-to-end here; verify against your actual pipeline.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', 'video-auto-posts');
const INBOX = path.join(ROOT, 'inbox');
const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.mkv'];

function ensureInbox() { if (!fs.existsSync(INBOX)) fs.mkdirSync(INBOX, { recursive: true }); }

// List finished videos the GPU pipeline dropped in inbox/.
function listReadyMedia() {
  ensureInbox();
  return fs.readdirSync(INBOX)
    .filter((f) => VIDEO_EXT.includes(path.extname(f).toLowerCase()))
    .map((f) => ({ fileName: f, fullPath: path.join(INBOX, f), size: fs.statSync(path.join(INBOX, f)).size }));
}

// Attach a ready media file (from inbox) to an already-queued job.
// Sets mediaPath (local) and, if PUBLIC_MEDIA_BASE_URL is set, a public
// mediaUrl that media platforms (IG/TikTok) can pull from.
// Uses orchestrator.attachMedia so the change is actually PERSISTED.
function attachMediaToJob(orchestrator, jobId, fileName) {
  const full = path.join(INBOX, fileName);
  if (!fs.existsSync(full)) throw new Error('media not found in inbox: ' + fileName);
  const base = process.env.PUBLIC_MEDIA_BASE_URL; // e.g. https://cdn.yoursite.com/media
  const mediaUrl = base ? base.replace(/\/$/, '') + '/' + encodeURIComponent(fileName) : undefined;
  return orchestrator.attachMedia(jobId, { mediaPath: full, mediaUrl });
}

// Optional HTTP generation: ask a local generator for a video URL.
async function requestVideo(topic) {
  const url = process.env.VIDEO_GEN_URL;
  if (!url) return { ok: false, skipped: true, reason: 'VIDEO_GEN_URL not set (folder mode only)' };
  if (!topic) throw new Error('topic is required');
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    let body; try { body = await resp.json(); } catch (e) { body = {}; }
    if (!resp.ok) return { ok: false, error: body.error || ('generator HTTP ' + resp.status) };
    if (!body.mediaUrl) return { ok: false, error: 'generator did not return mediaUrl' };
    return { ok: true, mediaUrl: body.mediaUrl };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { listReadyMedia, attachMediaToJob, requestVideo };
