// lib/platformControl/databaseReadiness.js — read-only DB readiness. No DB connection required.
'use strict';
const cfg = require('./config');

function getDatabaseReadiness() {
  const adaptersPreview = cfg.HINTS.database.filter((p) => cfg.exists(p)).map(cfg_safe);
  function cfg_safe(p) { return p; }
  const databaseUrlConfiguredPreview = !!process.env.DATABASE_URL || !!process.env.DB_HOST;
  return cfg.safetyFlags({
    liveDbConnectionEnabled: false,
    dbConnectionRequiredToStart: false,
    adaptersPreview,
    jsonStoreAvailablePreview: cfg.exists('data') || cfg.exists('lib/txnStore.js'),
    databaseUrlConfiguredPreview,
    migrationsPresentPreview: cfg.exists('migrations'),
    warnings: databaseUrlConfiguredPreview ? [] : ['no_external_db_configured_using_local_store_preview'],
    blockers: [],
  });
}
module.exports = { getDatabaseReadiness };
