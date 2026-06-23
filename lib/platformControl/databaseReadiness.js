// lib/platformControl/databaseReadiness.js — read-only DB readiness. No DB connection required.
'use strict';
const cfg = require('./config');

function getDatabaseReadiness() {
  const adaptersPreview = cfg.HINTS.database.filter((p) => cfg.exists(p)).map(cfg_safe);
  function cfg_safe(p) { return p; }
  const databaseUrlConfiguredPreview = !!process.env.DATABASE_URL || !!process.env.DB_HOST;
  const jsonStorageDetectedPreview = cfg.exists('data') || cfg.exists('lib/txnStore.js');
  const migrationSystemDetectedPreview = cfg.exists('migrations');
  return cfg.safetyFlags({
    liveDbConnectionEnabled: false,
    liveDbMutation: false,
    dbConnectionRequiredToStart: false,
    adaptersPreview,
    dbConfiguredPreview: databaseUrlConfiguredPreview,
    databaseUrlConfiguredPreview,
    jsonStorageDetectedPreview,
    jsonStoreAvailablePreview: jsonStorageDetectedPreview,
    migrationSystemDetectedPreview,
    migrationsPresentPreview: migrationSystemDetectedPreview,
    warnings: databaseUrlConfiguredPreview ? [] : ['no_external_db_configured_using_local_store_preview'],
    blockers: [],
  });
}
module.exports = { getDatabaseReadiness };
