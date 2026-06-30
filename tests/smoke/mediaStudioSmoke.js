// tests/smoke/mediaStudioSmoke.js
// Offline smoke test for the AI media studio. Points COMFYUI_HOST at an
// unreachable address so it exercises the placeholder fallback path with no GPU.
// Exit code 0 = pass.
//
// Run: node tests/smoke/mediaStudioSmoke.js

process.env.COMFYUI_HOST = 'http://127.0.0.1:0'; // unreachable -> fallback

const assert = require('assert');
const fs = require('fs');
const studio = require('../../lib/mediaStudio/mediaStudio');
const comfy = require('../../lib/mediaStudio/comfyClient');

(async () => {
  let passed = 0;

  // graph builder shape
  const g = comfy.buildTxt2ImgGraph({ prompt: 'a red shoe', width: 768, height: 768, steps: 10 });
  assert.ok(g['3'] && g['3'].class_type === 'KSampler'); passed++;
  assert.strictEqual(g['5'].inputs.width, 768); passed++;
  assert.strictEqual(g['6'].inputs.text, 'a red shoe'); passed++;

  // missing prompt should throw
  let threw = false;
  try { await studio.generate({}); } catch { threw = true; }
  assert.ok(threw, 'generate without prompt/product should throw'); passed++;

  // fallback path produces a placeholder file and a job entry
  const r = await studio.generate({ storeId: 'media_smoke', prompt: 'blue ceramic mug', type: 'product' });
  assert.strictEqual(r.status, 'fallback'); passed++;
  assert.strictEqual(r.source, 'placeholder'); passed++;
  assert.ok(r.file && r.file.endsWith('.svg')); passed++;
  const fp = studio.filePath(r.file);
  assert.ok(fp && fs.existsSync(fp), 'placeholder file should exist'); passed++;

  // product convenience prompt
  const r2 = await studio.generate({ product: { name: 'Wireless Earbuds', description: 'noise cancelling' }, type: 'marketing' });
  assert.ok(/Wireless Earbuds/.test(r2.promptUsed)); passed++;

  // job retrievable
  assert.ok(studio.getJob(r.id), 'job should be retrievable by id'); passed++;

  // health reports unreachable cleanly
  const h = await studio.health();
  assert.strictEqual(h.comfyReachable, false); passed++;

  console.log(`\u2705 mediaStudio smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c mediaStudio smoke failed:', e); process.exit(1); });
