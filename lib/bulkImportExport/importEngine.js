// lib/bulkImportExport/importEngine.js — Parse CSV, map columns, validate every row, and (only when
// commit:true) upsert into the contact book via lib/contacts (dedupe-aware). DRY-RUN by default:
// returns a full preview (valid/invalid counts, per-row errors, sample) without writing anything.
// Every run is recorded as a job in history.

const store = require('./store');
const { config } = require('./config');
const csv = require('./csv');
const { buildMapping, applyMapping } = require('./columnMapper');
const { validateRow } = require('./validators');

let contactsLib = null; try { contactsLib = require('../contacts'); } catch (_e) { contactsLib = null; }

function _maskClean(c) {
 const maskP = (p) => { if (!p) return null; const s = String(p); return s.length <= 4 ? '****' : s.slice(0, 3) + '****' + s.slice(-2); };
 const maskE = (e) => { if (!e) return null; const [u, d] = String(e).split('@'); return (u ? u.slice(0, 2) : '') + '***@' + (d || ''); };
 return { phoneMasked: maskP(c.phone), emailMasked: maskE(c.email), name: c.name ? c.name[0] + '***' : '', tags: c.tags, fields: c.fields };
}

// input: { csvText, mapping?, commit?, source?, delimiter? }
function run(input = {}) {
 if (!config.enabled) throw new Error('bulk import/export disabled');
 const { csvText, mapping: explicit = {}, commit = false, source = 'csv-import', delimiter = ',' } = input;
 if (csvText === undefined || csvText === null) throw new Error('csvText is required');

 const { headers, rows } = csv.parse(csvText, { delimiter });
 if (!headers.length) throw new Error('CSV has no header row');
 if (rows.length > config.maxRows) throw new Error(`too many rows: ${rows.length} > max ${config.maxRows}`);

 const mapping = buildMapping(headers, explicit);
 if (!mapping.phone && !mapping.email) throw new Error('could not map a phone or email column; provide an explicit mapping');

 const results = rows.map((raw, idx) => validateRow(applyMapping(raw, mapping, headers), idx));
 const valid = results.filter((r) => r.valid);
 const invalid = results.filter((r) => !r.valid);

 const willCommit = commit === true && !!contactsLib;
 let imported = 0, created = 0, merged = 0;
 const commitErrors = [];
 if (willCommit) {
 for (const r of valid) {
 try {
 const out = contactsLib.contactStore.upsert({ phone: r.clean.phone, email: r.clean.email, name: r.clean.name, tags: r.clean.tags, fields: r.clean.fields, source });
 imported += 1; if (out.created) created += 1; else merged += 1;
 } catch (e) { commitErrors.push({ rowIndex: r.rowIndex, error: e.message }); }
 }
 }

 const job = {
 id: store.genId('imp'),
 source, committed: willCommit, commitRequested: commit === true,
 contactsLibAvailable: !!contactsLib,
 headers, mapping: { phone: mapping.phone, email: mapping.email, name: mapping.name, tagsColumn: mapping.tagsColumn, fields: mapping.fields },
 totals: { rows: rows.length, valid: valid.length, invalid: invalid.length, imported, created, merged, commitErrors: commitErrors.length },
 invalidSample: invalid.slice(0, 20).map((r) => ({ rowIndex: r.rowIndex, errors: r.errors })),
 validSample: valid.slice(0, 10).map((r) => _maskClean(r.clean)),
 commitErrors: commitErrors.slice(0, 20),
 createdAt: store.nowIso(),
 };
 const d = store.load();
 d.jobs.push(job);
 if (d.jobs.length > config.maxJobHistory) d.jobs = d.jobs.slice(-config.maxJobHistory);
 store.save(d);

 return {
 jobId: job.id,
 dryRun: !willCommit,
 note: !contactsLib ? 'contacts library not present: preview only, nothing committed'
 : (commit === true ? 'committed to contact book' : 'dry-run preview; pass commit:true to write'),
 ...job.totals,
 mapping: job.mapping,
 invalidSample: job.invalidSample,
 validSample: job.validSample,
 };
}

function listJobs(limit = 50) { return store.load().jobs.slice(-limit).reverse(); }
function getJob(id) { return store.load().jobs.find((j) => j.id === id) || null; }

module.exports = { run, listJobs, getJob };
