#!/usr/bin/env node
// scripts/voice-ai-check.js — Voice AI doctor CLI. Prints health checks. Exit 0 unless a hard fail.
const V = require('../lib/voiceAI');
const report = V.doctor.run();
console.log('Voice AI Command Center — Doctor');
console.log('Dry-run:', report.dryRun, '| healthy:', report.healthy);
report.checks.forEach((c) => {
  const icon = c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️ ' : '❌';
  console.log(`${icon} [${c.status}] ${c.id}: ${c.message}`);
});
console.log(`Summary: ok=${report.summary.ok} warn=${report.summary.warn} fail=${report.summary.fail}`);
process.exit(report.summary.fail === 0 ? 0 : 1);
