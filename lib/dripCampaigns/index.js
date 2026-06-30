// lib/dripCampaigns/index.js — Drip Campaigns: automated multi-step follow-up journeys (barrel).
//
// Define journeys (ordered steps with wait delays + merge-field messages), enroll contacts via
// events (signup / abandoned_cart / payment_success / inactivity / manual), and advance due
// steps on a tick. Per-contact dedupe, stop conditions, quiet hours, and a daily per-contact cap.
//
// SAFETY: JSON-backed, PII masked in views. Steps are DRAFT-ONLY until DRIP_CAMPAIGNS_LIVE_SENDS=true
// AND a notifier is wired via require('./lib/dripCampaigns').setNotifier(fn). Call tick() from a
// scheduler (e.g. node-cron, already a dep) to drive the journeys forward.

const { config } = require('./config');
const notify = require('./notify');

module.exports = {
 config,
 store: require('./store'),
 privacy: require('./privacy'),
 mergeRender: require('./mergeRender'),
 journeyStore: require('./journeyStore'),
 notify,
 enrollmentEngine: require('./enrollmentEngine'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
