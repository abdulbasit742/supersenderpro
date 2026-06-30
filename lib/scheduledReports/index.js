// lib/scheduledReports/index.js — Scheduled Reports & Exports (barrel export).
//
// Define recurring reports (one or more sources + a cron schedule + CSV/JSON format + a recipient),
// run them into archived point-in-time snapshots pulled from analytics #9 / billing / support #3 /
// drip #6 / links #32 / sender-health #30 / consent #38 overviews, render CSV or JSON, and
// (draft-only) deliver to the recipient. Drive schedules by calling reportEngine.runDue() from a
// tick (node-cron is already a dep); cron parsing reuses lib/messageScheduler when present.
//
// SAFETY: JSON-backed. Reports are built + archived always; EXTERNAL delivery is DRAFT-ONLY until
// SCHEDULED_REPORTS_LIVE_DELIVERY=true AND a notifier is wired via
// require('./lib/scheduledReports').setNotifier(fn). Sources are read-only + non-fatal (missing
// depts degrade to null).

const { config, SOURCES, FORMATS } = require('./config');
const notify = require('./notify');

module.exports = {
 config, SOURCES, FORMATS,
 store: require('./store'),
 csv: require('./csv'),
 sources: require('./sources'),
 notify,
 reportEngine: require('./reportEngine'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
