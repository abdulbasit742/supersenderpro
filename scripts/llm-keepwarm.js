#!/usr/bin/env node
// scripts/llm-keepwarm.js
// Keep the self-hosted model resident on PC #1 so first-token latency stays low.
// Pairs with OLLAMA_KEEP_ALIVE=-1, but a periodic touch also re-loads the model
// if it was evicted (e.g. another process grabbed VRAM). Logs a metric each run.
//
// Usage:
//   node scripts/llm-keepwarm.js
//   node scripts/llm-keepwarm.js --model qwen2.5:32b
//
// Cron (PC #1), every 5 minutes:
//   */5 * * * *  cd /path/to/supersenderpro && node scripts/llm-keepwarm.js >> data/llm_ops/keepwarm.log 2>&1

const ops = require('../lib/llmOps/llmOps');

function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(async () => {
  const model = val('--model', undefined);
  const r = await ops.keepWarm({ model });
  const s = await ops.status();
  console.log(`[llm-keepwarm] ${new Date().toISOString()} warmed=${r.warmed} latency=${r.latencyMs || '-'}ms reachable=${s.reachable} loaded=${JSON.stringify(s.loadedModels)}`);
  process.exit(r.warmed ? 0 : 1);
})().catch((e) => { console.error('[llm-keepwarm] failed:', e); process.exit(1); });
