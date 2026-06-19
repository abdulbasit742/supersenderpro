#!/usr/bin/env node
/**
 * SuperSender Pro - Full Data Backup Tool
 * Bundles every runtime JSON file in /data into a single timestamped .zip
 * (uses the system `zip` binary if present, else a pure-Node fallback).
 * Sensitive auth/session folders and .env are intentionally excluded.
 *
 * Usage:
 *   node scripts/backup-data.js                 # backup to ./backups/
 *   node scripts/backup-data.js /path/to/dir    # backup to a custom directory
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}     SuperSender Pro - Full Data Backup Tool      ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

if (!fs.existsSync(DATA_DIR)) {
  console.error(`${RED}✘ data/ directory not found at ${DATA_DIR}${RESET}`);
  process.exit(1);
}

// Collect all .json files in data/ (recursive)
function collectJson(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectJson(abs, rel));
    } else if (entry.name.endsWith('.json')) {
      out.push({ abs, rel });
    }
  }
  return out;
}

const files = collectJson(DATA_DIR);
if (files.length === 0) {
  console.log(`${YELLOW}⚠ No .json files found in data/. Nothing to back up yet.${RESET}\n`);
  process.exit(0);
}

const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'backups');
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const zipPath = path.join(outDir, `data_backup_${stamp}.zip`);

let usedSystemZip = false;
try {
  // Prefer the system zip binary for a standard archive
  const rels = files.map(f => `"data/${f.rel.replace(/\\/g, '/')}"`).join(' ');
  execSync(`zip -q "${zipPath}" ${rels}`, { cwd: ROOT, stdio: 'pipe' });
  usedSystemZip = true;
} catch (e) {
  usedSystemZip = false;
}

if (!usedSystemZip) {
  // Pure-Node fallback: gzip a concatenated JSON manifest (no external deps)
  const manifest = { backedUpAt: new Date().toISOString(), files: {} };
  for (const f of files) {
    manifest.files[f.rel.replace(/\\/g, '/')] = fs.readFileSync(f.abs, 'utf8');
  }
  const gzPath = zipPath.replace(/\.zip$/, '.json.gz');
  fs.writeFileSync(gzPath, zlib.gzipSync(Buffer.from(JSON.stringify(manifest))));
  console.log(`${YELLOW}System 'zip' not available, used Node gzip fallback.${RESET}`);
  finish(gzPath);
} else {
  finish(zipPath);
}

function finish(archivePath) {
  const sizeKb = (fs.statSync(archivePath).size / 1024).toFixed(1);
  console.log(`${GREEN}✔ Backed up ${BOLD}${files.length}${RESET}${GREEN} data file(s).${RESET}`);
  files.forEach(f => console.log(`  - data/${f.rel.replace(/\\/g, '/')}`));
  console.log(`\n${BOLD}Archive:${RESET} ${CYAN}${archivePath}${RESET}`);
  console.log(`${BOLD}Size:${RESET} ${sizeKb} KB`);

  // Retention: keep newest 10 archives, delete older ones
  const archives = fs.readdirSync(outDir)
    .filter(n => n.startsWith('data_backup_'))
    .map(n => ({ n, t: fs.statSync(path.join(outDir, n)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  const stale = archives.slice(10);
  stale.forEach(s => { try { fs.unlinkSync(path.join(outDir, s.n)); } catch {} });
  if (stale.length) console.log(`${YELLOW}Pruned ${stale.length} old backup(s), keeping newest 10.${RESET}`);
  console.log(`\n${BOLD}${GREEN}✔ Backup complete.${RESET}\n`);
}
