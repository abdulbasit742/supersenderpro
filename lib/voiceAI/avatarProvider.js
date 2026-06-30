// avatarProvider.js
// Thin client for a SELF-HOSTED talking-avatar / digital-human engine
// (e.g. LiveTalking github.com/lipku/metahuman-stream or CyberVerse) running
// on your own GPUs (2x RTX A6000). Generates a presenter video from text +
// (optionally) a property image.
//
// SAFETY: dry-run by default. With AVATAR_DRY_RUN!=='false' it returns a stub
// and makes NO network call. Flip to live only after the engine is up.
//
// Env:
//   AVATAR_ENGINE_URL   e.g. http://127.0.0.1:8010   (your self-hosted endpoint)
//   AVATAR_DRY_RUN      'true' (default) | 'false'
//   AVATAR_DEFAULT_FACE  optional avatar/face id registered in the engine

const DRY_RUN = (process.env.AVATAR_DRY_RUN || 'true') !== 'false';
const ENGINE_URL = process.env.AVATAR_ENGINE_URL || 'http://127.0.0.1:8010';

/**
 * generateAvatarVideo
 * @param {object} p { tenantId, text, faceId?, imageUrl?, lang? }
 * @returns {Promise<{ok:boolean, dryRun:boolean, videoUrl?:string, jobId?:string, message?:string}>}
 */
async function generateAvatarVideo(p = {}) {
  const { tenantId, text, faceId, imageUrl, lang = 'und' } = p;
  if (!tenantId) throw new Error('[avatarProvider] tenantId is required (tenant isolation)');
  if (!text) throw new Error('[avatarProvider] text is required');

  if (DRY_RUN) {
    return {
      ok: true,
      dryRun: true,
      message: 'DRY_RUN: avatar video not generated. Set AVATAR_DRY_RUN=false and start the engine to go live.',
      preview: { tenantId, chars: text.length, faceId: faceId || process.env.AVATAR_DEFAULT_FACE || 'default', lang }
    };
  }

  try {
    const resp = await fetch(`${ENGINE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        face_id: faceId || process.env.AVATAR_DEFAULT_FACE,
        image_url: imageUrl,
        lang
      })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    return { ok: true, dryRun: false, videoUrl: data.video_url, jobId: data.job_id };
  } catch (err) {
    console.error('[avatarProvider] generate failed:', err.message);
    return { ok: false, dryRun: false, message: err.message };
  }
}

module.exports = { generateAvatarVideo };
