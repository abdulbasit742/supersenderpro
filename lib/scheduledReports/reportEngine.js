// lib/scheduledReports/reportEngine.js — Define recurring reports, run them into archived snapshots,
// render CSV/JSON, and (draft-only) deliver. A report: { id, name, sources[], format, schedule
// (cron), timezone, recipient, active }. run() builds a point-in-time snapshot from the configured
// sources, renders it in the chosen format, archives the run, and dispatches to the recipient.
//
// Scheduling itself is delegated: call runDue() from a tick (node-cron) — it uses lib/messageScheduler's
// dependency-free cron when present to decide which reports are due, else you can call run(id) directly.

const store = require('./store');
const { config, SOURCES, FORMATS } = require('./config');
const sources = require('./sources');
const csv = require('./csv');
const notify = require('./notify');

let cronLib = null; try { cronLib = require('../messageScheduler').cron; } catch (_e) { cronLib = null; }

function publicView(r) {
 if (!r) return null;
 return { id: r.id, name: r.name, sources: r.sources, format: r.format, schedule: r.schedule || null, timezone: r.timezone || 'UTC', recipient: r.recipient ? _mask(r.recipient) : null, active: r.active, lastRunAt: r.lastRunAt || null, nextRunAt: r.nextRunAt || null, runCount: r.runCount || 0, createdAt: r.createdAt };
}
function _mask(t) { const s = String(t); if (s.includes('@')) { const [u, d] = s.split('@'); return (u.slice(0, 2) || '') + '***@' + (d || ''); } return s.length <= 4 ? '****' : s.slice(0, 3) + '****' + s.slice(-2); }

function create({ name, sources: srcs, format = 'json', schedule, timezone = 'UTC', recipient } = {}) {
 const useSources = (Array.isArray(srcs) && srcs.length ? srcs : ['analytics']).filter((s) => SOURCES.includes(s));
 if (!useSources.length) throw new Error('at least one valid source is required: ' + SOURCES.join(', '));
 if (!FORMATS.includes(format)) throw new Error('format must be one of: ' + FORMATS.join(', '));
 if (schedule && cronLib && !cronLib.isValid(schedule)) throw new Error('invalid cron schedule');
 const d = store.load();
 const now = store.nowIso();
 const rec = {
 id: store.genId('rep'), name: name || 'Report', sources: useSources, format,
 schedule: schedule || null, timezone, recipient: recipient || null, active: true,
 lastRunAt: null, nextRunAt: (schedule && cronLib) ? cronLib.nextRun(schedule, Date.now(), timezone) : null,
 runCount: 0, createdAt: now, updatedAt: now,
 };
 d.reports.push(rec); store.save(d);
 return publicView(rec);
}

function _render(snapshot, format) {
 if (format === 'csv') {
 // Flatten each available source's card counts into key,value rows prefixed by source.
 const rows = [];
 for (const s of snapshot.available) {
 const data = snapshot.sources[s];
 const cards = (data && data.cards) ? data.cards : data;
 if (cards && typeof cards === 'object') {
 for (const [k, v] of Object.entries(cards)) rows.push({ source: s, key: k, value: (typeof v === 'object' ? JSON.stringify(v) : v) });
 }
 }
 return csv.fromRows(rows, ['source', 'key', 'value']);
 }
 return JSON.stringify(snapshot, null, 2);
}

async function run(reportId, { refNow = Date.now() } = {}) {
 const d = store.load();
 const rep = d.reports.find((r) => r.id === reportId);
 if (!rep) throw new Error('report not found');
 const snap = sources.snapshot(rep.sources);
 const rendered = _render(snap, rep.format);
 const attachmentName = `${rep.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date(refNow).toISOString().slice(0, 10)}.${rep.format}`;

 const runRec = {
 id: store.genId('run'), reportId: rep.id, name: rep.name, format: rep.format,
 sourcesAvailable: snap.available, sizeBytes: Buffer.byteLength(rendered, 'utf8'),
 attachmentName, content: rendered, delivered: false, at: new Date(refNow).toISOString(),
 };
 // Deliver (draft-only unless live).
 const delivery = await notify.dispatch(rep.recipient, { subject: `${rep.name} — ${runRec.at.slice(0, 10)}`, body: rep.format === 'json' ? 'Report attached (JSON).' : 'Report attached (CSV).', attachmentName, attachment: rendered });
 runRec.delivered = !!delivery.sent; runRec.deliveryDraft = !delivery.sent;

 d.runs.push(runRec);
 // Retain only the most recent N runs per report.
 const mine = d.runs.filter((x) => x.reportId === rep.id);
 if (mine.length > config.maxRunsPerReport) {
 const excess = mine.length - config.maxRunsPerReport;
 const toDropIds = new Set(mine.slice(0, excess).map((x) => x.id));
 d.runs = d.runs.filter((x) => !toDropIds.has(x.id));
 }
 rep.lastRunAt = runRec.at; rep.runCount = (rep.runCount || 0) + 1;
 if (rep.schedule && cronLib) rep.nextRunAt = cronLib.nextRun(rep.schedule, refNow, rep.timezone);
 rep.updatedAt = store.nowIso();
 store.save(d);

 return { runId: runRec.id, reportId: rep.id, format: rep.format, sizeBytes: runRec.sizeBytes, sourcesAvailable: snap.available, delivered: runRec.delivered, deliveryDraft: !!runRec.deliveryDraft, attachmentName };
}

// Run every active scheduled report whose nextRunAt is due. Needs the cron lib for scheduling.
async function runDue(refNow = Date.now()) {
 const d = store.load();
 const due = d.reports.filter((r) => r.active && r.schedule && r.nextRunAt && Date.parse(r.nextRunAt) <= refNow);
 const results = [];
 for (const r of due) results.push(await run(r.id, { refNow }));
 return { processed: results.length, results };
}

function list() { return store.load().reports.map(publicView); }
function get(id) { return publicView(store.load().reports.find((r) => r.id === id)); }
function setActive(id, active) { const d = store.load(); const r = d.reports.find((x) => x.id === id); if (!r) throw new Error('report not found'); r.active = !!active; r.updatedAt = store.nowIso(); store.save(d); return publicView(r); }
function runs(reportId, limit = 20) { return store.load().runs.filter((x) => x.reportId === reportId).slice(-limit).reverse().map((x) => ({ id: x.id, at: x.at, format: x.format, sizeBytes: x.sizeBytes, sourcesAvailable: x.sourcesAvailable, delivered: x.delivered, attachmentName: x.attachmentName })); }
function runContent(runId) { const x = store.load().runs.find((r) => r.id === runId); return x ? { format: x.format, attachmentName: x.attachmentName, content: x.content } : null; }

function overview() {
 const d = store.load();
 return { generatedAt: store.nowIso(), liveDelivery: config.effective.liveDelivery, cronAvailable: !!cronLib, cards: { reports: d.reports.length, active: d.reports.filter((r) => r.active).length, scheduled: d.reports.filter((r) => r.schedule).length, runs: d.runs.length, delivered: d.runs.filter((r) => r.delivered).length } };
}

module.exports = { create, run, runDue, list, get, setActive, runs, runContent, overview, publicView, SOURCES, FORMATS };
