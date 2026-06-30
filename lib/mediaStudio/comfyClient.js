// lib/mediaStudio/comfyClient.js
// ────────────────────────────────────────────────────────────────────
// Minimal ComfyUI client. Talks to a self-hosted ComfyUI instance (PC #2, the
// Linux GPU/video box) over its HTTP API: queue a prompt graph, poll history
// until the run completes, then fetch the produced image bytes.
//
// No SDK, no new npm deps: Node built-ins + global fetch (Node >= 18).
// ────────────────────────────────────────────────────────────────────

const crypto = require('crypto');

const HOST = () => process.env.COMFYUI_HOST || 'http://127.0.0.1:8188';
const DEFAULT_MODEL = () => process.env.COMFYUI_MODEL || 'sd_xl_base_1.0.safetensors';

/**
 * Build a standard txt2img workflow graph (ComfyUI "prompt" format).
 * Kept intentionally simple + model-agnostic (SD/SDXL checkpoints).
 */
function buildTxt2ImgGraph({
  prompt,
  negativePrompt = 'lowres, blurry, watermark, text, deformed',
  model = DEFAULT_MODEL(),
  width = 1024,
  height = 1024,
  steps = 25,
  cfg = 7,
  sampler = 'euler',
  scheduler = 'normal',
  seed = Math.floor(Math.random() * 1e15)
} = {}) {
  return {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: model } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: negativePrompt, clip: ['4', 1] } },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed, steps, cfg, sampler_name: sampler, scheduler, denoise: 1,
        model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0]
      }
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'supersender', images: ['8', 0] } }
  };
}

async function queuePrompt(graph, clientId) {
  const res = await fetch(`${HOST()}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: graph, client_id: clientId })
  });
  if (!res.ok) throw new Error(`ComfyUI /prompt HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.prompt_id) throw new Error('ComfyUI: no prompt_id returned');
  return data.prompt_id;
}

async function getHistory(promptId) {
  const res = await fetch(`${HOST()}/history/${promptId}`);
  if (!res.ok) throw new Error(`ComfyUI /history HTTP ${res.status}`);
  return res.json();
}

async function fetchImage({ filename, subfolder = '', type = 'output' }) {
  const qs = new URLSearchParams({ filename, subfolder, type }).toString();
  const res = await fetch(`${HOST()}/view?${qs}`);
  if (!res.ok) throw new Error(`ComfyUI /view HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

/**
 * Run a graph end-to-end and return the first produced image as a Buffer.
 * Polls /history until the SaveImage node reports outputs (or times out).
 */
async function runGraph(graph, { timeoutMs = 120000, pollMs = 1500 } = {}) {
  const clientId = crypto.randomUUID();
  const promptId = await queuePrompt(graph, clientId);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollMs));
    let hist;
    try { hist = await getHistory(promptId); } catch { continue; }
    const entry = hist && hist[promptId];
    if (!entry || !entry.outputs) continue;
    for (const nodeId of Object.keys(entry.outputs)) {
      const images = entry.outputs[nodeId].images;
      if (images && images.length) {
        const img = images[0];
        const bytes = await fetchImage(img);
        return { promptId, filename: img.filename, bytes };
      }
    }
  }
  throw new Error('ComfyUI: generation timed out');
}

async function ping() {
  try {
    const res = await fetch(`${HOST()}/system_stats`, { method: 'GET' });
    return res.ok;
  } catch { return false; }
}

module.exports = { buildTxt2ImgGraph, queuePrompt, getHistory, fetchImage, runGraph, ping, HOST, DEFAULT_MODEL };
