// developerPortal/adapters/backupRestoreAdapter.js — safe adapter for Backup/Restore.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Backup/Restore', detectFiles:['scripts/backup-data.js'], events:['backup.check_completed'] });
