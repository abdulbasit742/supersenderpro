'use strict';
/**
 * lib/backup/snapshot.js - point-in-time backup + restore of the json tenant store.
 * The json driver persists under data/tenant_store/<tenantId>/<collection>.json. This captures
 * the whole tree into a single timestamped JSON snapshot and can restore it.
 *
 * (When you move to postgres, use pg_dump instead - this is for the json-driver phase, and for
 * cheap local snapshots before risky operations like a bulk erase.)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const STORE_DIR = path.join(ROOT, 'data', 'tenant_store');
const BACKUP_DIR = path.join(ROOT, 'backups');

function walk(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const tenant of fs.readdirSync(dir)) {
    const tdir = path.join(dir, tenant);
    if (!fs.statSync(tdir).isDirectory()) continue;
    out[tenant] = {};
    for (const f of fs.readdirSync(tdir)) {
      if (!f.endsWith('.json')) continue;
      try { out[tenant][f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(tdir, f), 'utf8')); } catch { out[tenant][f.replace(/\.json$/, '')] = []; }
    }
  }
  return out;
}

function createSnapshot(label) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const tree = walk(STORE_DIR);
  const tenants = Object.keys(tree);
  const rows = tenants.reduce((n, t) => n + Object.values(tree[t]).reduce((m, arr) => m + (Array.isArray(arr) ? arr.length : 0), 0), 0);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = 'snapshot-' + stamp + (label ? '-' + String(label).replace(/[^a-z0-9_-]/gi, '') : '') + '.json';
  const file = path.join(BACKUP_DIR, name);
  const payload = { createdAt: new Date().toISOString(), tenants: tenants.length, rows, data: tree };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return { file: path.relative(ROOT, file), tenants: tenants.length, rows };
}

function listSnapshots() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('snapshot-') && f.endsWith('.json'))
    .map((f) => { const st = fs.statSync(path.join(BACKUP_DIR, f)); return { file: 'backups/' + f, sizeKB: Math.round(st.size / 1024), at: st.mtime.toISOString() }; })
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

// restore: writes the snapshot tree back. dryRun reports what WOULD change without writing.
// Does not delete tenants that exist now but not in the snapshot, unless prune=true.
function restoreSnapshot(fileRel, { dryRun = true, prune = false } = {}) {
  const file = path.isAbsolute(fileRel) ? fileRel : path.join(ROOT, fileRel);
  if (!fs.existsSync(file)) throw new Error('snapshot not found: ' + fileRel);
  const snap = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!snap || !snap.data) throw new Error('invalid snapshot file');
  const plan = { restore: [], prune: [], dryRun };
  for (const [tenant, collections] of Object.entries(snap.data)) {
    for (const [coll, rows] of Object.entries(collections)) {
      plan.restore.push({ tenant, coll, rows: Array.isArray(rows) ? rows.length : 0 });
      if (!dryRun) {
        const tdir = path.join(STORE_DIR, tenant);
        fs.mkdirSync(tdir, { recursive: true });
        fs.writeFileSync(path.join(tdir, coll + '.json'), JSON.stringify(rows, null, 2));
      }
    }
  }
  if (prune && fs.existsSync(STORE_DIR)) {
    for (const tenant of fs.readdirSync(STORE_DIR)) {
      if (!snap.data[tenant]) { plan.prune.push(tenant); if (!dryRun) fs.rmSync(path.join(STORE_DIR, tenant), { recursive: true, force: true }); }
    }
  }
  return Object.assign({ snapshot: fileRel, restoredAt: dryRun ? null : new Date().toISOString() }, plan);
}

module.exports = { createSnapshot, listSnapshots, restoreSnapshot, STORE_DIR, BACKUP_DIR };
