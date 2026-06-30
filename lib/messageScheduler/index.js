// lib/messageScheduler/index.js — Message Scheduler: scheduled + recurring sends (barrel export).
//
// Schedule one-off or recurring (cron-expression) message jobs to a single contact or a saved
// segment (resolved consent-safe via lib/contacts when present). Timezone-aware next-run
// computation (built-in Intl, no dependency), quiet-hours deferral, retry/backoff on failure,
// and pause/resume/cancel. Call tick() from a scheduler (node-cron is already a dep) to fire due jobs.
//
// SAFETY: JSON-backed; contacts masked in views. Sends are DRAFT-ONLY until
// MESSAGE_SCHEDULER_LIVE_SENDS=true AND a notifier is wired via
// require('./lib/messageScheduler').setNotifier(fn).

const { config } = require('./config');
const notify = require('./notify');

module.exports = {
 config,
 store: require('./store'),
 privacy: require('./privacy'),
 timezone: require('./timezone'),
 cron: require('./cron'),
 notify,
 jobEngine: require('./jobEngine'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
