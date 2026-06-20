#!/usr/bin/env node
// scripts/public-funnel-check.js — runs the public funnel doctor and writes artifacts.
// Read-only / dry-run. No external calls, no sends, no live writes.

const fs = require('fs');
const path = require('path');
const doctor = require('../lib/publicSaasFunnel/doctor');

function main() {
  const report = doctor.run();
  const artifactsDir = path.join(__dirname, '..', 'artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  fs.writeFileSync(path.join(artifactsDir, 'public_funnel_check.json'), JSON.stringify(report, null, 2));

  const md = [];
  md.push('# Public SaaS Funnel — Check Report');
  md.push('');
  md.push(`Generated: ${report.generatedAt}`);
  md.push(`Result: ${report.ok ? '✅ PASS' : '❌ FAIL'} (${report.passed}/${report.total} checks passed)`);
  md.push('');
  md.push('## Checks');
  md.push('| Check | Status | Detail |');
  md.push('|---|---|---|');
  for (const c of report.checks) md.push(`| ${c.name} | ${c.ok ? '✅' : '❌'} | ${(c.detail || '').replace(/\n/g, ' ').slice(0, 120)} |`);
  md.push('');
  md.push('## Adapter status');
  md.push('| Adapter | Detected |');
  md.push('|---|---|');
  for (const [k, v] of Object.entries(report.adapters)) md.push(`| ${k} | ${v ? 'yes' : 'no (fallback)'} |`);
  md.push('');
  md.push('## Safety posture');
  md.push('```json');
  md.push(JSON.stringify(report.safety, null, 2));
  md.push('```');
  fs.writeFileSync(path.join(artifactsDir, 'public_funnel_check.md'), md.join('\n'));

  console.log(`[public-funnel:check] ${report.ok ? 'PASS' : 'FAIL'} ${report.passed}/${report.total}`);
  if (!report.ok) {
    const failed = report.checks.filter((c) => !c.ok).map((c) => c.name);
    console.log('[public-funnel:check] failed:', failed.join(', '));
    process.exitCode = 1;
  }
}

main();
