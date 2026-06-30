// lib/mediaStudio/mediaStudio.js
// ────────────────────────────────────────────────────────────────────
// High-level AI media studio. Turns a prompt (or a product) into images for
// WhatsApp: product shots, marketing creatives, and stickers. Generation runs
// on the self-hosted ComfyUI box (PC #2) — zero cloud cost, on-prem.
//
// Outputs are written to data/generated_media/ and tracked in a file-backed
// job log. If ComfyUI is unreachable the studio returns a placeholder SVG and
// marks the job 'fallback', so callers (and the API) never hard-fail.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const comfy = require('./comfyClient');

const OUT_DIR = path.join(__dirname, '..', '..', 'data', 'generated_media');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const jobsFile = path.join(OUT_DIR, '_jobs.json');

function readJobs() {
  try { return fs.existsSync(jobsFile) ? JSON.parse(fs.readFileSync(jobsFile, 'utf8')) : []; }
  catch { return []; }
}
function writeJobs(jobs) {
  try { fs.writeFileSync(jobsFile, JSON.stringify(jobs.slice(-500), null, 2)); }
  catch (e) { console.error('[mediaStudio] jobs write failed:', e.message); }
}
function logJob(job) { const jobs = readJobs(); jobs.push(job); writeJobs(jobs); return job; }

// ── Style presets ─────────────────────────────────────────────────
const PRESETS = {
  product: {
    suffix: 'professional product photography, clean studio lighting, white background, high detail, commercial, 4k',
    width: 1024, height: 1024
  },
  marketing: {
    suffix: 'vibrant marketing creative, eye-catching, modern, social media ad, bold composition, high contrast',
    width: 1024, height: 1024
  },
  sticker: {
    suffix: 'cute sticker, die-cut, bold outline, flat colors, transparent-style background, kawaii, vector art',
    width: 768, height: 768
  }
};

function placeholderSVG(text) {
  const safe = String(text || 'media').replace(/[<&>]/g, '').slice(0, 60);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768">\n` +
    `<rect width="100%" height="100%" fill="#0e1525"/>\n` +
    `<text x="50%" y="46%" fill="#7c9cff" font-family="sans-serif" font-size="34" text-anchor="middle">AI Media Studio</text>\n` +
    `<text x="50%" y="54%" fill="#9aa7bd" font-family="sans-serif" font-size="20" text-anchor="middle">${safe}</text>\n` +
    `<text x="50%" y="62%" fill="#55617a" font-family="sans-serif" font-size="14" text-anchor="middle">(ComfyUI offline — placeholder)</text>\n` +
    `</svg>`, 'utf8');
}

/**
 * Generate one image.
 * @param {object} opts
 * @param {string} opts.prompt - what to draw (required unless `product` given)
 * @param {('product'|'marketing'|'sticker')} [opts.type='product']
 * @param {object} [opts.product] - { name, description } convenience
 * @param {number} [opts.steps] @param {number} [opts.width] @param {number} [opts.height]
 * @returns {Promise<{ id, status, type, file?, url?, mime, promptUsed, source }>}
 */
async function generate({ storeId = 'default_store', prompt, type = 'product', product, steps, width, height, negativePrompt } = {}) {
  const preset = PRESETS[type] || PRESETS.product;
  let basePrompt = prompt;
  if (!basePrompt && product && product.name) {
    basePrompt = `${product.name}${product.description ? ', ' + product.description : ''}`;
  }
  if (!basePrompt) throw new Error('prompt or product.name is required');

  const fullPrompt = `${basePrompt}, ${preset.suffix}`;
  const id = crypto.randomUUID().slice(0, 12);
  const base = { id, storeId, type, promptUsed: fullPrompt, ts: Date.now() };

  try {
    const graph = comfy.buildTxt2ImgGraph({
      prompt: fullPrompt,
      negativePrompt: negativePrompt || undefined,
      width: width || preset.width,
      height: height || preset.height,
      steps: steps || 25
    });
    const { bytes, filename } = await comfy.runGraph(graph);
    const outName = `${id}.png`;
    fs.writeFileSync(path.join(OUT_DIR, outName), bytes);
    const job = logJob({ ...base, status: 'done', source: 'comfyui', file: outName, mime: 'image/png', comfyFilename: filename });
    return { ...job, url: `/api/media-studio/file/${outName}` };
  } catch (err) {
    console.warn('[mediaStudio] ComfyUI generation failed, returning placeholder:', err.message);
    const outName = `${id}.svg`;
    fs.writeFileSync(path.join(OUT_DIR, outName), placeholderSVG(basePrompt));
    const job = logJob({ ...base, status: 'fallback', source: 'placeholder', file: outName, mime: 'image/svg+xml', error: err.message });
    return { ...job, url: `/api/media-studio/file/${outName}` };
  }
}

function listJobs({ storeId, limit = 50 } = {}) {
  let jobs = readJobs().slice().reverse();
  if (storeId) jobs = jobs.filter(j => j.storeId === storeId);
  return jobs.slice(0, limit);
}

function getJob(id) { return readJobs().find(j => j.id === id) || null; }

function filePath(name) {
  // prevent path traversal
  const safe = path.basename(String(name));
  const p = path.join(OUT_DIR, safe);
  return fs.existsSync(p) ? p : null;
}

async function health() {
  const reachable = await comfy.ping();
  return {
    ok: true,
    comfyHost: comfy.HOST(),
    model: comfy.DEFAULT_MODEL(),
    comfyReachable: reachable,
    outputDir: OUT_DIR,
    totalJobs: readJobs().length
  };
}

module.exports = { generate, listJobs, getJob, filePath, health, _internal: { PRESETS, placeholderSVG } };
