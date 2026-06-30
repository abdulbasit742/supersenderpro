// lib/bulkImportExport/index.js — Bulk Import/Export (barrel export).
//
// Dependency-free CSV parsing + a column-mapping/validation pipeline that normalizes phone/email
// (PK-aware via lib/contacts when present), flags + skips bad rows, previews before commit, and
// (only on commit:true) upserts dedupe-aware into the contact book. Plus CSV/JSON export of the
// contact book.
//
// SAFETY: imports DRY-RUN by default — a job validates + previews every row and writes NOTHING
// unless commit:true AND lib/contacts is installed. Sample rows are masked in job records.
// Exports mask PII unless includePII:true (owner backups, behind admin auth).

const { config } = require('./config');

module.exports = {
 config,
 store: require('./store'),
 csv: require('./csv'),
 validators: require('./validators'),
 columnMapper: require('./columnMapper'),
 importEngine: require('./importEngine'),
 exportEngine: require('./exportEngine'),
 doctor: require('./doctor'),
};
