'use strict';
/** scripts/backup-snapshot.js - create a snapshot of the json tenant store. Usage: node scripts/backup-snapshot.js [label] */
const { createSnapshot, listSnapshots } = require('../lib/backup/snapshot');
const label = process.argv[2];
const r = createSnapshot(label);
console.log('Snapshot created: ' + r.file + '  (' + r.tenants + ' tenants, ' + r.rows + ' rows)');
console.log('\nExisting snapshots:');
listSnapshots().slice(0, 10).forEach((s) => console.log('  ' + s.file + '  ' + s.sizeKB + 'KB  ' + s.at));
