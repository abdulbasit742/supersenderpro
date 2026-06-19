#!/usr/bin/env node
/**
 * SuperSender Pro - Data Restore Tool
 * Restores runtime JSON files from a backup produced by scripts/backup-data.js
 * (supports both the .zip and the Node .json.gz fallback formats).
 * Always snapshots the CURRENT data/ first so a restore is reversible.
 *
 * Usage:
 *   node scripts/restore-data.js                       # restore newest backup in ./backups
 *   node scripts/restore-data.js backups/<file>.json.gz
 *   node scripts/restore-data.js backups/<file>.zip
 *   node scripts/restore-data.js --list                # list available backups
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const BACKUP_DIR = path.join(ROOT, 'backups');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GREY = '\x1b[90m';

const args = process.argv.slice(2);

console.log(`${BOLD}${CYAN}==================================================${RESET}`);
console.log(`${BOLD}${CYAN}      SuperSender Pro - Data Restore Tool         ${RESET}`);
console.log(`${BOLD}${CYAN}==================================================${RESET}\n`);

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(n => n.startsWith('data_backup_'))
    .map(n => ({ name: n, full: path.join(BACKUP_DIR, n), t: fs.statSync(path.join(BACKUP_DIR, n)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
}

const backups = listBackups();

if (args.includes('--list')) {
  if (!backups.length) {
    console.log(`${YELLOW}No backups found in ${BACKUP_DIR}.${RESET}\n`);
  } else {
    console.log(`${BOLD}Available backups (newest first):${RESET}`);
    backups.forEach((b, i) => console.log(`  ${i === 0 ? GREEN + '→' : ' '} ${b.name}${RESET} ${GREY}(${new Date(b.t).toISOString()})${RESET}`));
    console.log('');
  }
  process.exit(0);
}

// Resolve which archive to restore
let archive = args[0] ? path.resolve(args[0]) : (backups[0] && backups[0].full);
if (!archive) {
  console.error(`${RED}✘ No backup specified and none found in ./backups.${RESET}`);
  console.log(`Run a backup first:  ${BOLD}npm run backup:data${RESET}\n`);
  process.exit(1);
}
if (!fs.existsSync(archive)) {
  console.error(`${RED}✘ Backup file not found: ${archive}${RESET}`);
  process.exit(1);
}

console.log(`${BOLD}Restoring from:${RESET} ${CYAN}${archive}${RESET}\n`);

fs.mkdirSync(DATA_DIR, { recursive: true });

// Snapshot current data/ before overwriting (reversible restore)
const preRestore = path.join(BACKUP_DIR, `pre_restore_${Date.now()}.json.gz`);
try {
  const cur = {};
  if (fs.existsSync(DATA_DIR)) {
    for (const f of collectJson(DATA_DIR)) cur[f.rel] = fs.readFileSync(f.abs, 'utf8');
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(preRestore, zlib.gzipSync(Buffer.from(JSON.stringify({ snapshotAt: new Date().toISOString(), files: cur }))));
  console.log(`${GREY}Safety snapshot of current data saved: ${preRestore}${RESET}\n`);
} catch (e) {
  console.log(`${YELLOW}Could not snapshot current data: ${e.message}${RESET}`);
}

let restored = 0;
if (archive.endsWith('.json.gz')) {
  const manifest = JSON.parse(zlib.gunzipSync(fs.readFileSync(archive)).toString());
  for (const [rel, content] of Object.entries(manifest.files || {})) {
    const dest = path.join(DATA_DIR, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, 'utf8');
    console.log(`${GREEN}✔ Restored${RESET} data/${rel}`);
    restored++;
  }
} else if (archive.endsWith('.zip')) {
  try {
    execSync(`unzip -o "${archive}" -d "${ROOT}"`, { stdio: 'pipe' });
    restored = collectJson(DATA_DIR).length;
    console.log(`${GREEN}✔ Extracted zip into project root (data/ overwritten).${RESET}`);
  } catch (e) {
    console.error(`${RED}✘ Failed to unzip: ${e.message}. Is 'unzip' installed?${RESET}`);
    process.exit(1);
  }
} else {
  console.error(`${RED}✘ Unsupported backup format. Expected .json.gz or .zip${RESET}`);
  process.exit(1);
}

console.log(`\n${BOLD}${GREEN}✔ Restore complete. ${restored} file(s) restored.${RESET}`);
console.log(`${GREY}Previous data was snapshotted to ${preRestore} in case you need to undo.${RESET}\n`);

function collectJson(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJson(abs, rel));
    else if (entry.name.endsWith('.json')) out.push({ abs, rel });
  }
  return out;
}
