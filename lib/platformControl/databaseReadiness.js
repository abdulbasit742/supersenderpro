// lib/platformControl/databaseReadiness.js — DB/JSON storage presence, no DB connection/mutation.
 'use strict';
 const cfg = require('./config');


 function databaseReadiness() {
     const keys = cfg.envKeyNames();
     const pkg = cfg.readJSON('package.json') || {};
     const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
     return cfg.base({
       liveDbMutation: false,
       dbConfiguredPreview: keys.includes('DATABASE_URL') || keys.includes('DB_HOST') || keys.includes('MONGODB_URI'),
       jsonStorageDetectedPreview: cfg.exists('data') || cfg.hasFile([/store\.js$/i]),
       sqliteDetectedPreview: !!deps['better-sqlite3'] || !!deps.sqlite3 || cfg.hasFile([/sqlite/i]),
       postgresDetectedPreview: !!deps.pg || cfg.hasFile([/postgres|\bpg[_.]/i]),
       migrationSystemDetectedPreview: cfg.exists('migrations') || cfg.hasFile([/migration/i]),
     });
 }


 module.exports = { databaseReadiness };
