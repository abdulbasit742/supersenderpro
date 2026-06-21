// lib/platformControl/backupReadiness.js — backup script/folder presence.
  'use strict';
  const cfg = require('./config');


  function backupReadiness() {
    const hasData = cfg.exists('data');
      return cfg.base({
        backupScriptDetectedPreview: cfg.hasFile([/backup|restore/i]),
        backupFolderDetectedPreview: cfg.exists('backups') || cfg.exists('data/backups'),
        dataFolderDetectedPreview: hasData,
        recommendationsPreview: hasData ? ['schedule periodic data/ backups before release'] : [],
      });
  }


  module.exports = { backupReadiness };
