'use strict';
/**
 * AI Data Export & Backup
 * - Exports all tenant-scoped data under data/ into a single JSON bundle.
 * - On-demand + scheduled backups, kept under data/dataExport/<tenantId>/backups/.
 * - Restore from a backup manifest (dry-run by default).
 * - Zero new deps. Node built-ins only. Tenant isolation enforced.
 * - Optional AI (ai/aiBrain.processPrompt) only summarizes a backup in plain words;
 *   everything works with no model.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_ROOT = path.join(process.cwd(), 'data');
const FEATURE_DIR = path.join(DATA_ROOT, 'dataExport');

function requireTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantId is required');
  }
  return tenantId;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function tenantBackupDir(tenantId) {
  return path.join(FEATURE_DIR, tenantId, 'backups');
}

// Walk data/ and collect files that belong to this tenant.
// Convention across the suite: tenant files live under data/<feature>/<tenantId>/...
// or are JSON objects carrying a tenantId field.
function collectTenantFiles(tenantId) {
  const out = [];
  if (!fs.existsSync(DATA_ROOT)) return out;
  const stack = [DATA_ROOT];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        // skip this feature's own backup output to avoid recursion
        if (full.startsWith(tenantBackupDir(tenantId))) continue;
        stack.push(full);
        continue;
      }
      const rel = path.relative(DATA_ROOT, full);
      const parts = rel.split(path.sep);
      // path-scoped: data/<feature>/<tenantId>/...
      const pathScoped = parts.length >= 2 && parts[1] === tenantId;
      if (pathScoped) {
        out.push(rel);
        continue;
      }
      // content-scoped: JSON file carrying tenantId
      if (full.endsWith('.json')) {
        try {
          const raw = fs.readFileSync(full, 'utf8');
          if (raw.indexOf(tenantId) !== -1) {
            const obj = JSON.parse(raw);
            if (matchesTenant(obj, tenantId)) out.push(rel);
          }
        } catch (_) { /* not our file */ }
      }
    }
  }
  return out.sort();
}

function matchesTenant(obj, tenantId) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.tenantId === tenantId) return true;
  if (Array.isArray(obj)) return obj.some((x) => matchesTenant(x, tenantId));
  return Object.values(obj).some((v) => v && typeof v === 'object' && matchesTenant(v, tenantId));
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Build an in-memory export bundle for a tenant.
function buildBundle(tenantId) {
  requireTenant(tenantId);
  const files = collectTenantFiles(tenantId);
  const records = [];
  for (const rel of files) {
    const full = path.join(DATA_ROOT, rel);
    let content = '';
    try { content = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
    records.push({ path: rel, bytes: Buffer.byteLength(content, 'utf8'), sha256: sha256(content), content });
  }
  const meta = {
    tenantId,
    createdAt: new Date().toISOString(),
    fileCount: records.length,
    totalBytes: records.reduce((a, r) => a + r.bytes, 0),
  };
  const bundle = { manifest: meta, files: records };
  bundle.manifest.checksum = sha256(JSON.stringify(records.map((r) => [r.path, r.sha256])));
  return bundle;
}

// Write a backup to disk, return manifest (without file contents).
function createBackup(tenantId, label) {
  const bundle = buildBundle(tenantId);
  const dir = tenantBackupDir(tenantId);
  ensureDir(dir);
  const stamp = bundle.manifest.createdAt.replace(/[:.]/g, '-');
  const safeLabel = (label || 'backup').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const fileName = `${stamp}__${safeLabel}.json`;
  const outPath = path.join(dir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(bundle));
  return Object.assign({}, bundle.manifest, { backupFile: fileName, label: safeLabel });
}

function listBackups(tenantId) {
  requireTenant(tenantId);
  const dir = tenantBackupDir(tenantId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const full = path.join(dir, f);
      let manifest = {};
      try { manifest = JSON.parse(fs.readFileSync(full, 'utf8')).manifest || {}; } catch (_) {}
      return { backupFile: f, createdAt: manifest.createdAt, fileCount: manifest.fileCount, totalBytes: manifest.totalBytes, checksum: manifest.checksum };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function loadBackup(tenantId, backupFile) {
  requireTenant(tenantId);
  const safe = path.basename(backupFile);
  const full = path.join(tenantBackupDir(tenantId), safe);
  if (!fs.existsSync(full)) throw new Error('backup not found');
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

// Restore: dry-run by default. apply=true actually writes files back.
function restoreBackup(tenantId, backupFile, opts) {
  opts = opts || {};
  const apply = opts.apply === true;
  const bundle = loadBackup(tenantId, backupFile);
  if (bundle.manifest.tenantId !== tenantId) {
    throw new Error('tenant mismatch: backup does not belong to this tenant');
  }
  const plan = [];
  for (const rec of bundle.files) {
    // hard guard: only restore into this tenant's scope
    const parts = rec.path.split(path.sep);
    const pathScoped = parts.length >= 2 && parts[1] === tenantId;
    const contentScoped = rec.content.indexOf(tenantId) !== -1;
    if (!pathScoped && !contentScoped) {
      plan.push({ path: rec.path, action: 'skip', reason: 'out-of-scope' });
      continue;
    }
    const full = path.join(DATA_ROOT, rec.path);
    const exists = fs.existsSync(full);
    let changed = true;
    if (exists) {
      try { changed = sha256(fs.readFileSync(full, 'utf8')) !== rec.sha256; } catch (_) {}
    }
    const action = !exists ? 'create' : (changed ? 'overwrite' : 'unchanged');
    if (apply && action !== 'unchanged') {
      ensureDir(path.dirname(full));
      fs.writeFileSync(full, rec.content);
    }
    plan.push({ path: rec.path, action });
  }
  return { tenantId, backupFile, applied: apply, planned: plan.length, plan };
}

// Optional AI plain-words summary of a backup. Falls back to a template.
async function describeBackup(tenantId, backupFile) {
  const manifest = loadBackup(tenantId, backupFile).manifest;
  const template = `Backup ${backupFile}: ${manifest.fileCount} files, ${manifest.totalBytes} bytes, taken ${manifest.createdAt}.`;
  try {
    const brain = require(path.join(process.cwd(), 'ai', 'aiBrain'));
    if (brain && typeof brain.processPrompt === 'function') {
      const res = await brain.processPrompt({
        tenantId,
        system: 'You summarize a data backup in one short plain sentence for a business owner.',
        prompt: `Backup manifest: ${JSON.stringify(manifest)}. One short sentence.`,
      });
      const text = (res && (res.text || res.output || res.content)) || '';
      if (text && text.trim()) return text.trim();
    }
  } catch (_) { /* offline -> template */ }
  return template;
}

// Retention: keep newest N backups, delete the rest.
function pruneBackups(tenantId, keep) {
  requireTenant(tenantId);
  keep = Number.isInteger(keep) && keep > 0 ? keep : 14;
  const all = listBackups(tenantId);
  const remove = all.slice(keep);
  for (const b of remove) {
    try { fs.unlinkSync(path.join(tenantBackupDir(tenantId), b.backupFile)); } catch (_) {}
  }
  return { kept: Math.min(keep, all.length), removed: remove.length };
}

module.exports = {
  buildBundle,
  createBackup,
  listBackups,
  loadBackup,
  restoreBackup,
  describeBackup,
  pruneBackups,
  collectTenantFiles,
  _requireTenant: requireTenant,
};
