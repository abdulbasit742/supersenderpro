// lib/platformControl/storageReadiness.js — read-only data folder / storage readiness.
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getStorageReadiness() {
  const foldersPreview = cfg.HINTS.storage.map((p) => ({ folder: safeText(p), exists: cfg.exists(p) }));
  const writableHintPreview = cfg.exists('data');
  return cfg.safetyFlags({
    liveStorageMutation: false,
    foldersPreview,
    writableHintPreview,
    artifactsFolderPreview: cfg.exists('artifacts'),
    warnings: writableHintPreview ? [] : ['data_folder_missing_preview'],
    blockers: [],
  });
}
module.exports = { getStorageReadiness };
