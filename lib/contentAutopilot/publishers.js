// lib/contentAutopilot/publishers.js
// Real, credential-gated platform publishers for the Content Autopilot.
//
// HONESTY CONTRACT:
// - Uses global fetch (Node 18+). No new npm dependency.
// - Every publisher checks for its required env tokens first. If any are
//   missing it returns { ok:false, skipped:true, missingEnv:[...] } and does
//   NOT attempt a post.
// - When tokens ARE present, it performs the REAL documented API call and
//   returns { ok:true, id } on success or { ok:false, error } on failure.
// - Media platforms (Instagram, YouTube, TikTok) need a publicly reachable
//   media URL. If absent, they return a clear error rather than guessing.
// - This file has NOT been run end-to-end. Treat as UNVERIFIED until tested
//   with real credentials on your machine.

function text(job) {
  const c = job.content || {};
  const tags = Array.isArray(c.hashtags) ? c.hashtags.join(' ') : '';
  return [c.caption, c.body, tags].filter(Boolean).join('\n\n').trim();
}

function need(envKeys) {
  const missing = envKeys.filter((k) => !process.env[k]);
  return missing.length ? missing : null;
}

async function asJson(resp) {
  let body;
  try { body = await resp.json(); } catch (e) { body = { raw: await resp.text().catch(() => '') }; }
  return body;
}

// --- Facebook Page (text post) ---------------------------------------------
async function facebook(job) {
  const missing = need(['META_ACCESS_TOKEN', 'FB_PAGE_ID']);
  if (missing) return { ok: false, skipped: true, reason: 'no credentials', missingEnv: missing, api: 'Facebook Graph API' };
  const url = `https://graph.facebook.com/v19.0/${process.env.FB_PAGE_ID}/feed`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text(job), access_token: process.env.META_ACCESS_TOKEN }),
  });
  const body = await asJson(resp);
  return resp.ok ? { ok: true, id: body.id, api: 'Facebook' } : { ok: false, error: body.error || body, api: 'Facebook' };
}

// --- Instagram (needs image/video URL; 2-step container then publish) ------
async function instagram(job) {
  const missing = need(['META_ACCESS_TOKEN', 'IG_BUSINESS_ID']);
  if (missing) return { ok: false, skipped: true, reason: 'no credentials', missingEnv: missing, api: 'Instagram Graph API' };
  const mediaUrl = job.mediaUrl || job.mediaPath;
  if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
    return { ok: false, error: 'Instagram requires a public mediaUrl (http/https) on the job', api: 'Instagram' };
  }
  const base = `https://graph.facebook.com/v19.0/${process.env.IG_BUSINESS_ID}`;
  // 1) create media container
  const createResp = await fetch(`${base}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: mediaUrl, caption: text(job), access_token: process.env.META_ACCESS_TOKEN }),
  });
  const created = await asJson(createResp);
  if (!createResp.ok || !created.id) return { ok: false, error: created.error || created, api: 'Instagram (container)' };
  // 2) publish container
  const pubResp = await fetch(`${base}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: created.id, access_token: process.env.META_ACCESS_TOKEN }),
  });
  const published = await asJson(pubResp);
  return pubResp.ok ? { ok: true, id: published.id, api: 'Instagram' } : { ok: false, error: published.error || published, api: 'Instagram (publish)' };
}

// --- LinkedIn (text share via UGC posts) -----------------------------------
async function linkedin(job) {
  const missing = need(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN']);
  if (missing) return { ok: false, skipped: true, reason: 'no credentials', missingEnv: missing, api: 'LinkedIn UGC Posts API' };
  const resp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: process.env.LINKEDIN_AUTHOR_URN, // e.g. urn:li:person:xxxx or urn:li:organization:xxxx
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: text(job) },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  const body = await asJson(resp);
  return resp.ok ? { ok: true, id: body.id || resp.headers.get('x-restli-id'), api: 'LinkedIn' } : { ok: false, error: body, api: 'LinkedIn' };
}

// --- YouTube (video upload requires a real file stream; not done over JSON) -
async function youtube(job) {
  const missing = need(['YOUTUBE_ACCESS_TOKEN']);
  if (missing) return { ok: false, skipped: true, reason: 'no credentials', missingEnv: missing, api: 'YouTube Data API' };
  // Real YouTube uploads are resumable multipart uploads of an actual video
  // binary, which needs a file stream from disk. That belongs in a dedicated
  // uploader with the video file present. We do not fake it here.
  return { ok: false, error: 'YouTube upload needs a resumable multipart upload with the video file; run the dedicated uploader with a local file path', api: 'YouTube', notImplemented: true };
}

// --- TikTok (Content Posting API; needs pull_url to a public video) ---------
async function tiktok(job) {
  const missing = need(['TIKTOK_ACCESS_TOKEN']);
  if (missing) return { ok: false, skipped: true, reason: 'no credentials', missingEnv: missing, api: 'TikTok Content Posting API' };
  const mediaUrl = job.mediaUrl || job.mediaPath;
  if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
    return { ok: false, error: 'TikTok requires a public video URL (pull_url) on the job', api: 'TikTok' };
  }
  const resp = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_info: { title: text(job).slice(0, 150), privacy_level: 'SELF_ONLY' },
      source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl },
    }),
  });
  const body = await asJson(resp);
  return resp.ok ? { ok: true, id: (body.data && body.data.publish_id) || null, api: 'TikTok' } : { ok: false, error: body, api: 'TikTok' };
}

// --- WhatsApp (reuse SuperSender's own sending path) -----------------------
// Intentionally an opt-in hook: the autopilot is for public social posts.
// To broadcast a post over WhatsApp, wire this to your WatiBroadcast instance
// at the call site (it needs a sendDirect callback + storeId + segment).
async function whatsapp() {
  return { ok: false, skipped: true, reason: 'wire to WatiBroadcast at call site (needs sendDirect + storeId + segment)', api: 'WhatsApp' };
}

module.exports = { facebook, instagram, linkedin, youtube, tiktok, whatsapp };
