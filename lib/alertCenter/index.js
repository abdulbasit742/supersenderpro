// lib/alertCenter/index.js — Notifications & Alerts (barrel export).
//
// Rule-based internal alerting: emit(event, payload) matches active rules (safe JSON conditions,
// NO eval), applies per-rule throttle/dedupe, records to an in-app feed, and routes the 'owner'
// channel through a pluggable notifier. Ships sensible default rules (SLA breach, payment,
// send failure, usage exceeded). Other departments call emit() to surface what matters.
//
// SAFETY: JSON-backed. The in-app feed always records; EXTERNAL owner delivery is DRAFT-ONLY
// until ALERT_CENTER_LIVE_DELIVERY=true AND a notifier is wired via
// require('./lib/alertCenter').setNotifier(fn). Throttling prevents alert storms.

const { config, SEVERITIES } = require('./config');
const notify = require('./notify');
const alertEngine = require('./alertEngine');

module.exports = {
 config, SEVERITIES,
 store: require('./store'),
 conditionMatcher: require('./conditionMatcher'),
 ruleStore: require('./ruleStore'),
 notify,
 alertEngine,
 emit: alertEngine.emit,
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
