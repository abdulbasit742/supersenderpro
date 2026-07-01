#!/usr/bin/env node
// scripts/wire-ai-suite.js
// Prints exactly how to wire the AI suite into server.js — either the one-liner
// mounter or the explicit per-feature app.use lines — plus an env checklist and
// which features are currently installed. Read-only; prints, changes nothing.
//
// Usage:  node scripts/wire-ai-suite.js
//         node scripts/wire-ai-suite.js --explicit   (print individual app.use lines)

const suite = require('../lib/aiSuite/aiSuite');

function tryRequire(p) { try { return require(p); } catch { return null; } }

(async () => {
  const explicit = process.argv.includes('--explicit');
  console.log('\n=== SuperSender AI Suite — wiring ===\n');

  console.log('Option A (recommended) — mount everything in one line, near your other routes in server.js:\n');
  console.log("  require('./lib/aiSuite/aiSuite').mountAll(app);");
  console.log("  app.use('/api/ai-suite', require('./routes/aiSuiteRoutes')); // health + control panel\n");

  if (explicit) {
    console.log('Option B — explicit mounts (only the installed ones shown):\n');
    for (const f of suite.REGISTRY) {
      const installed = Boolean(tryRequire(f.router));
      if (installed) console.log(`  app.use('${f.path}', require('${f.router.replace('../../', './')}'));`);
    }
    console.log('');
  }

  const health = await suite.aggregateHealth();
  console.log(`Installed features: ${health.installed}/${health.total}  |  healthy now: ${health.up}\n`);
  for (const x of health.features) {
    const mark = !x.installed ? '— not installed' : (x.ok ? 'OK' : 'INSTALLED (unreachable now)');
    console.log(`  [${x.installed ? (x.ok ? '\u2713' : '!') : ' '}] ${x.label.padEnd(34)} ${x.path.padEnd(26)} ${mark}`);
  }

  console.log('\nEnv checklist (self-hosted defaults):');
  console.log('  OLLAMA_HOST=http://127.0.0.1:11434');
  console.log('  SUPPORT_AGENT_MODEL=qwen2.5:32b      OLLAMA_KEEP_ALIVE=-1');
  console.log('  RAG_EMBED_MODEL=nomic-embed-text     (ollama pull nomic-embed-text)');
  console.log('  WHISPER_HOST=http://<gpu>:8000       VISION_MODEL=llava:13b');
  console.log('  TTS_HOST=http://<gpu>:8001           AGENT_LANGUAGE=en');
  console.log('  LLM_FAILOVER_PROVIDERS=groq,openai   (cloud fallback only)');
  console.log('\nThen open  /api/ai-suite/panel  in a browser for the live control panel.\n');
  process.exit(0);
})().catch((e) => { console.error('wire-ai-suite failed:', e); process.exit(1); });
