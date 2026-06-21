'use strict';
const b = require('./_base');
function health() {
    const present = b.anyExists(['src/modules/backup', 'lib/backupRestore']);
    if (!present) return b.unavailable('Backup / Restore');
    const restoreWrite = b.envTrue('BACKUP_RESTORE_WRITE_ENABLED');
    return restoreWrite
    ? b.record('degraded', 'Restore WRITE is enabled (risk of overwrite)', { category: 'backup_restore', severity:
'high', recommendedFix: 'Keep restore in dry-run unless actively restoring.' })
     : b.record('healthy', 'Backup/restore present, restore-write disabled', { category: 'backup_restore' });
}
module.exports = { health };
