'use strict';
/**
 * backupRestore.js — Ops Feature #2: backup + restore.
 *
 * While the app is still JSON-file backed (pre-Postgres), one bad write or a wrong deploy can lose
 * data. This snapshots every data/*.json store into a single timestamped backup file, and can
 * restore them. Before any restore it takes an automatic safety backup, so restore is never a
 * one-way door.
 *
 * After the Postgres migration this becomes a thin wrapper around pg_dump; the command API stays.
 * Pure Node fs, no dependencies.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, '_backups');

function listDataFiles() {
  try {
    return fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .filter(f => !f.startsWith('_'));
  } catch { return []; }
}

/**
 * Create a backup. Returns { id, file, files, createdAt }.
 * @param {Object} opts { include?: string[], exclude?: string[] }
 */
function createBackup(opts = {}) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  let files = listDataFiles();
  if (Array.isArray(opts.include) && opts.include.length) files = files.filter(f => opts.include.includes(f));
  if (Array.isArray(opts.exclude) && opts.exclude.length) files = files.filter(f => !opts.exclude.includes(f));

  const bundle = { createdAt: new Date().toISOString(), version: 1, data: {} };
  for (const f of files) {
    try { bundle.data[f] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); }
    catch { bundle.data[f] = null; }
  }
  const id = `backup_${Date.now()}`;
  const file = path.join(BACKUP_DIR, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(bundle));
  return { id, file, files, createdAt: bundle.createdAt };
}

function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const full = path.join(BACKUP_DIR, f);
        const st = fs.statSync(full);
        return { id: f.replace(/\.json$/, ''), file: full, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch { return []; }
}

function readBackup(id) {
  const file = path.join(BACKUP_DIR, `${id.replace(/[^\w.-]/g, '')}.json`);
  if (!file.startsWith(BACKUP_DIR)) throw new Error('invalid backup id');
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/**
 * Restore from a backup id. Takes an automatic safety backup first. Returns { restored, safety }.
 * @param {Object} opts { only?: string[] }  restore only these files
 */
function restore(id, opts = {}) {
  const bundle = readBackup(id);
  if (!bundle || !bundle.data) throw new Error('backup not found or corrupt');
  const safety = createBackup({ });  // snapshot current state before overwriting

  const restored = [];
  for (const [f, content] of Object.entries(bundle.data)) {
    if (Array.isArray(opts.only) && opts.only.length && !opts.only.includes(f)) continue;
    if (content == null) continue;
    const safe = path.basename(f);
    if (!safe.endsWith('.json')) continue;
    try {
      fs.writeFileSync(path.join(DATA_DIR, safe), JSON.stringify(content, null, 2));
      restored.push(safe);
    } catch { /* skip */ }
  }
  return { restored, safetyBackupId: safety.id, from: id };
}

function deleteBackup(id) {
  const file = path.join(BACKUP_DIR, `${id.replace(/[^\w.-]/g, '')}.json`);
  if (!file.startsWith(BACKUP_DIR)) throw new Error('invalid backup id');
  if (fs.existsSync(file)) { fs.unlinkSync(file); return { deleted: true }; }
  return { deleted: false };
}

module.exports = { createBackup, listBackups, readBackup, restore, deleteBackup, listDataFiles };
