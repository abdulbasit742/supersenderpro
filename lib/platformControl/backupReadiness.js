// lib/platformControl/backupReadiness.js — read-only backup/restore readiness preview.
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getBackupReadiness() {
  const backupScriptPreview = cfg.exists('scripts/backup-data.js');
  const restoreScriptPreview = cfg.exists('scripts/restore-data.js');
  const manifestsPreview = ['BACKUP_MANIFEST.txt', 'BACKUP_MANIFEST_LATEST.txt'].filter((f) => cfg.exists(f)).map(safeText);
  return cfg.safetyFlags({
    liveBackupExecution: false,
    backupScriptPreview,
    restoreScriptPreview,
    manifestsPreview,
    warnings: (backupScriptPreview && restoreScriptPreview) ? [] : ['backup_or_restore_script_missing_preview'],
    blockers: [],
  });
}
module.exports = { getBackupReadiness };
