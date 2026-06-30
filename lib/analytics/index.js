// lib/analytics/index.js — Analytics & Reporting (barrel export).
//
// A single track() entry point for product/business events, time-series + breakdown rollups,
// funnel conversion analysis, a cross-department KPI snapshot (support / drip / billing), CSV
// export, and scheduled daily/weekly digest reports.
//
// SAFETY: JSON-backed; stores COUNTS/METRICS only, never message bodies or PII (dimension values
// that look like emails/phone numbers are redacted at ingest). Read-only over other departments.
// Digest delivery is DRAFT-ONLY until ANALYTICS_LIVE_DIGESTS=true AND a notifier is wired via
// require('./lib/analytics').setNotifier(fn).

const { config } = require('./config');
const notify = require('./notify');
const eventTracker = require('./eventTracker');

module.exports = {
 config,
 store: require('./store'),
 eventTracker,
 track: eventTracker.track,
 rollups: require('./rollups'),
 funnel: require('./funnel'),
 kpiSnapshot: require('./kpiSnapshot'),
 csvExport: require('./csvExport'),
 notify,
 digestBuilder: require('./digestBuilder'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
