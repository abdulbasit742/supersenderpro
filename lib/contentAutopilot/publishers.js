// lib/contentAutopilot/publishers.js
// Real platform publishers for the Social Content Autopilot.
//
// Honesty rules carried over from index.js:
// - Each publisher is CREDENTIAL-GATED. Missing env -> { ok:false, skipped:true, missingEnv }.
// - Implemented calls use Node's built-in https (no new npm deps).
// - On a real API error we return { ok:false, status, error } with the platform
//   response body, never a fake success.
// - These call the platforms' documented text/link post endpoints. Video/photo
//   upload flows (multi-step, resumable) are scaffolded per-platform with a clear
//   TODO and fall back to a text/link post where the API allows it.
//
// VERIFY LOCALLY with real tokens before trusting any 'ok:true'. Untested by author.

const https = require('https');

// Minimal JSON/form POST helper over https. Resolves { status, body }.
function httpsRequest(urlStr, { method = 'POST', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(urlStr); } catch (e) { return reject(new Error('bad url: ' + urlStr)); }
    const data = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const opts = {
      method,
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      headers: { ...headers },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', (d) => { chunks += d; });
      res.on('end', () => {
        let parsed = chunks;
        try { parsed = JSON.parse(chunks); } catch (e) { /* leave as text */ }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function formEncode(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== null)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]))
    .join('&');
}

function need(envKeys) {
  const missing = envKeys.filter((k) => !process.env[k]);
  return missing.length ? missing : null;
}

function text(job) {
  const c = job.content || {};
  const tags = Array.isArray(c.hashtags) ? c.hashtags.join(' ') : '';
  return [c.caption, c.body, tags].filter(Boolean).join('\n\n').trim();
}

// --- Facebook Page (text/link post) ----------------------------------------
async function facebook(job) {
  const missing = need(['META_ACCESS_TOKEN', 'FB_PAGE_ID']);
  if (missing) return { ok: false, skipped: true, missingEnv: missing, api: 'Facebook Graph API' };
  const url = `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed`;
  const res = await httpsRequest(url, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formEncode({ message: text(job), access_token: process.env.META_ACCESS_TOKEN }),
  });
  const ok = res.status >= 200 && res.status < 300 && res.body && res.body.id;
  return ok ? { ok: true, id: res.body.id, api: 'facebook' } : { ok: false, status: res.status, error: res.body, api: 'facebook' };
}

// --- Instagram (requires media; create container then publish) --------------
async function instagram(job) {
  const missing = need(['META_ACCESS_TOKEN', 'IG_BUSINESS_ID']);
  if (missing) return { ok: false, skipped: true, missingEnv: missing, api: 'Instagram Graph API' };
  // IG requires a publicly reachable image/video URL in mediaPath.
  if (!job.mediaPath || !/^https?:\/\//i.test(job.mediaPath)) {
    return { ok: false, error: 'Instagram needs a public mediaPath URL (image/video).', api: 'instagram' };
  }
  const base = `https://graph.facebook.com/v19.0/${process.env.IG_BUSINESS_ID}`;
  const create = await httpsRequest(`${base}/media`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formEncode({ image_url: job.mediaPath, caption: text(job), access_token: process.env.META_ACCESS_TOKEN }),
  });
  if (!(create.body && create.body.id)) return { ok: false, status: create.status, error: create.body, api: 'instagram' };
  const publish = await httpsRequest(`${base}/media_publish`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formEncode({ creation_id: create.body.id, access_token: process.env.META_ACCESS_TOKEN }),
  });
  const ok = publish.body && publish.body.id;
  return ok ? { ok: true, id: publish.body.id, api: 'instagram' } : { ok: false, status: publish.status, error: publish.body, api: 'instagram' };
}

// --- LinkedIn (UGC text post) ----------------------------------------------
async function linkedin(job) {
  const missing = need(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN']);
  if (missing) return { ok: false, skipped: true, missingEnv: missing, api: 'LinkedIn UGC API' };
  const payload = {
    author: process.env.LINKEDIN_AUTHOR_URN, // e.g. urn:li:person:xxxx
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: text(job) },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  const res = await httpsRequest('https://api.linkedin.com/v2/ugcPosts', {
    headers: {
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    },
    body: payload,
  });
  const ok = res.status >= 200 && res.status < 300 && res.body && (res.body.id || res.headers);
  return ok ? { ok: true, id: res.body.id || true, api: 'linkedin' } : { ok: false, status: res.status, error: res.body, api: 'linkedin' };
}

// --- WhatsApp (reuse SuperSender WATI broadcast) ---------------------------
async function whatsapp(job) {
  const missing = need(['WATI_API_KEY', 'WATI_BASE_URL', 'WATI_BROADCAST_NUMBER']);
  if (missing) return { ok: false, skipped: true, missingEnv: missing, api: 'WhatsApp (WATI)' };
  const url = `${process.env.WATI_BASE_URL.replace(/\/$/, '')}/api/v1/sendSessionMessage/${process.env.WATI_BROADCAST_NUMBER}`;
  const res = await httpsRequest(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WATI_API_KEY}` },
    body: { messageText: text(job) },
  });
  const ok = res.status >= 200 && res.status < 300;
  return ok ? { ok: true, api: 'whatsapp', body: res.body } : { ok: false, status: res.status, error: res.body, api: 'whatsapp' };
}

// --- YouTube (video upload = multi-step resumable; scaffolded) -------------
async function youtube(job) {
  const missing = need(['YOUTUBE_ACCESS_TOKEN']);
  if (missing) return { ok: false, skipped: true, missingEnv: missing, api: 'YouTube Data API' };
  // Real upload is a resumable multipart flow that needs the binary video file.
  // That belongs in a worker with the file on disk, not in this request path.
  return { ok: false, error: 'YouTube upload not implemented (needs resumable upload worker).', api: 'youtube', todo: true };
}

// --- TikTok (Content Posting API = init + upload; scaffolded) --------------
async function tiktok(job) {
  const missing = need(['TIKTOK_ACCESS_TOKEN']);
  if (missing) return { ok: false, skipped: true, missingEnv: missing, api: 'TikTok Content Posting API' };
  return { ok: false, error: 'TikTok publish not implemented (needs init+upload worker).', api: 'tiktok', todo: true };
}

module.exports = { facebook, instagram, linkedin, whatsapp, youtube, tiktok };
