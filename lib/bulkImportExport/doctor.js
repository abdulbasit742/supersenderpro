// lib/bulkImportExport/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const csv = require('./csv');

let contactsLib = null; try { contactsLib = require('../contacts'); } catch (_e) { contactsLib = null; }

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.jobs));
 // CSV round-trip sanity
 const parsed = csv.parse('a,b\n"x,y",2\n');
 ok('csv_parser_ok', parsed.headers.length === 2 && parsed.rows[0].a === 'x,y', 'handles quoted comma');
 ok('contacts_lib', !!contactsLib, contactsLib ? 'contacts dept present (import can commit)' : 'contacts dept absent (preview-only)');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, maxRows: config.maxRows, canCommitImports: !!contactsLib, canExport: !!contactsLib },
 counts: { jobs: d.jobs.length },
 checks,
 };
}

module.exports = { run };
