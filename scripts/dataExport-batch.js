'use strict';
/**
 * Scheduled backup runner (cron-friendly).
 * Usage: node scripts/dataExport-batch.js <tenantId> [keep]
 * Or set TENANTS="t1,t2,t3" to back up many tenants.
 * Self-hosted, offline-safe, zero deps.
 */
const de = require('../lib/dataExport/dataExport');

function run(tenantId, keep) {
  const manifest = de.createBackup(tenantId, 'scheduled');
  const prune = de.pruneBackups(tenantId, keep);
  console.log(JSON.stringify({ tenantId, backup: manifest.backupFile, files: manifest.fileCount, bytes: manifest.totalBytes, prune }));
}

function main() {
  const keep = parseInt(process.env.KEEP || process.argv[3] || '14', 10);
  const listEnv = process.env.TENANTS;
  const tenants = listEnv ? listEnv.split(',').map((s) => s.trim()).filter(Boolean) : [process.argv[2]];
  if (!tenants.length || !tenants[0]) {
    console.error('Usage: node scripts/dataExport-batch.js <tenantId> [keep]  (or TENANTS="a,b")');
    process.exit(1);
  }
  for (const t of tenants) {
    try { run(t, keep); } catch (e) { console.error(`backup failed for ${t}: ${e.message}`); }
  }
}

if (require.main === module) main();
module.exports = { run };
