'use strict';
/**
 * scripts/restore-snapshot.js - restore a snapshot. DRY-RUN by default.
 * Usage:
 *   node scripts/restore-snapshot.js backups/snapshot-....json            # dry-run (shows plan)
 *   node scripts/restore-snapshot.js backups/snapshot-....json --apply     # actually restore
 *   node scripts/restore-snapshot.js backups/snapshot-....json --apply --prune  # also remove tenants not in snapshot
 */
const { restoreSnapshot, listSnapshots } = require('../lib/backup/snapshot');
const file = process.argv[2];
if (!file) { console.log('Usage: node scripts/restore-snapshot.js <file> [--apply] [--prune]\n\nAvailable:'); listSnapshots().forEach((s) => console.log('  ' + s.file)); process.exit(1); }
const apply = process.argv.includes('--apply');
const prune = process.argv.includes('--prune');
const r = restoreSnapshot(file, { dryRun: !apply, prune });
console.log((apply ? 'RESTORED' : 'DRY-RUN (no changes written)') + ':');
console.log('  collections: ' + r.restore.length + '  rows: ' + r.restore.reduce((n, x) => n + x.rows, 0));
if (r.prune.length) console.log('  pruned tenants: ' + r.prune.join(', '));
if (!apply) console.log('\nRe-run with --apply to write these changes.');
