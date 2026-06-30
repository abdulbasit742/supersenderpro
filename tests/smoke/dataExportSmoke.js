'use strict';
/**
 * Offline smoke test for AI Data Export & Backup.
 * Forces Ollama unreachable so AI path falls back to template.
 * No network, no model, zero deps. Exits non-zero on failure.
 */
process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.LLM_DEFAULT_PROVIDER = 'ollama';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Run inside an isolated temp cwd so we never touch real data/.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'de-smoke-'));
const prevCwd = process.cwd();
process.chdir(tmp);

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj));
}

(async () => {
  // Seed tenant + non-tenant data.
  const T = 'tenant_smoke';
  const OTHER = 'tenant_other';
  writeJson(path.join('data', 'orders', T, 'o1.json'), { tenantId: T, total: 100 });
  writeJson(path.join('data', 'orders', OTHER, 'o2.json'), { tenantId: OTHER, total: 999 });
  writeJson(path.join('data', 'leads', 'mixed.json'), { tenantId: T, name: 'Ali' });

  const de = require(path.join(prevCwd, 'lib', 'dataExport', 'dataExport'));

  // 1) tenant guard
  assert.throws(() => de.buildBundle(), /tenantId is required/, 'missing tenant must throw');

  // 2) bundle only includes this tenant
  const bundle = de.buildBundle(T);
  const paths = bundle.files.map((f) => f.path);
  assert.ok(paths.some((p) => p.includes(T)), 'bundle should include tenant files');
  assert.ok(!paths.some((p) => p.includes(OTHER)), 'bundle must NOT include other tenant');
  assert.ok(bundle.manifest.checksum, 'manifest needs checksum');

  // 3) create + list backup
  const manifest = de.createBackup(T, 'unit');
  const backups = de.listBackups(T);
  assert.ok(backups.length >= 1, 'should list at least one backup');
  assert.strictEqual(backups[0].fileCount, manifest.fileCount, 'counts match');

  // 4) restore dry-run (no writes), then apply
  const dry = de.restoreBackup(T, manifest.backupFile, { apply: false });
  assert.strictEqual(dry.applied, false, 'dry-run flag');
  assert.ok(dry.plan.every((p) => p.action !== 'skip' || p.reason === 'out-of-scope'), 'plan sane');
  const applied = de.restoreBackup(T, manifest.backupFile, { apply: true });
  assert.strictEqual(applied.applied, true, 'apply flag');

  // 5) tenant-mismatch restore must throw
  assert.throws(() => de.restoreBackup(OTHER, manifest.backupFile, {}), /tenant mismatch/, 'cross-tenant restore blocked');

  // 6) AI describe falls back to template offline
  const summary = await de.describeBackup(T, manifest.backupFile);
  assert.ok(typeof summary === 'string' && summary.length > 0, 'summary string');

  // 7) prune keeps newest
  de.createBackup(T, 'second');
  const pruned = de.pruneBackups(T, 1);
  assert.strictEqual(pruned.kept, 1, 'prune keeps 1');

  process.chdir(prevCwd);
  console.log('dataExport smoke OK');
})().catch((e) => {
  try { process.chdir(prevCwd); } catch (_) {}
  console.error('dataExport smoke FAILED:', e && e.message);
  process.exit(1);
});
