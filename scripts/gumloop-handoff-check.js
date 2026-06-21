#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const ARTIFACTS = path.join(ROOT, 'artifacts');
const manifestBuilder = require(path.join(ROOT, 'lib/gumloopHandoff/manifestBuilder'));
const handoff = require(path.join(ROOT, 'lib/gumloopHandoff'));
function walk(dir, acc, depth) {
  if (depth > 8) return acc;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return acc; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'data', 'logs', 'uploads', 'sessions'].includes(e.name)) { acc.push(rel + '/'); continue; }
      walk(full, acc, depth + 1);
    } else acc.push(rel);
  }
  return acc;
}
function main() {
  if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
  const files = walk(ROOT, [], 0);
  const presentFiles = files.filter((f) => !f.endsWith('/'));
  const serverJsText = fs.existsSync(path.join(ROOT, 'server.js')) ? fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8') : '';
  const indexHtmlText = fs.existsSync(path.join(ROOT, 'public/index.html')) ? fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8') : '';
  let packageJson = {};
  try { packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')); } catch (_) {}
  const manifest = manifestBuilder.build({ files, presentFiles, serverJsText, indexHtmlText, packageJson });
  const result = { ok: true, dryRun: true, status: handoff.status(), counts: { safeToCopy: manifest.safeToCopy.length, neverCopy: manifest.neverCopy.length, unknownReview: manifest.unknownReview.length }, blockers: manifest.blockers, warnings: manifest.warnings };
  fs.writeFileSync(path.join(ARTIFACTS, 'gumloop_handoff_check.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(ARTIFACTS, 'gumloop_handoff_manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main();
