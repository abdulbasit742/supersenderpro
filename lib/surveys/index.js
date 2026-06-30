// lib/surveys/index.js — Surveys & NPS/CSAT Feedback (barrel export).
//
// Define NPS (0-10), CSAT (1-5), poll, or open-text surveys; send (draft-only) a survey prompt to
// a contact which opens a reply window; capture inbound replies, validate them against the open
// ask, record them, and score: NPS = %promoters - %detractors, CSAT = % satisfied + average,
// polls = counts per option. Pairs with consent #38 (don't survey opted-out), contacts #12,
// analytics #9, and alerts #28 (e.g. alert on a detractor).
//
// SAFETY: JSON-backed; contacts masked in views. The prompt send is DRAFT-ONLY until
// SURVEYS_LIVE_SEND=true AND a notifier is wired via require('./lib/surveys').setNotifier(fn).
// Consent is respected on send when the consent center is present.

const { config, TYPES } = require('./config');
const notify = require('./notify');
const surveyEngine = require('./surveyEngine');

module.exports = {
 config, TYPES,
 store: require('./store'),
 privacy: require('./privacy'),
 responseParser: require('./responseParser'),
 scoring: require('./scoring'),
 notify,
 surveyEngine,
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
 // convenience
 capture: surveyEngine.capture,
};
