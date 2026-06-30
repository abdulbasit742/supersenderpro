// lib/customer360/index.js — Customer 360 & Activity Timeline (barrel export).
//
// A single track() entry point records per-contact activity events (message_in/out, click,
// payment, ticket_opened/resolved, survey_response, nps_promoter/detractor, opt_in/opt_out,
// signup, abandoned_cart, login, custom) into a unified timeline. profile.build() rolls a
// contact's timeline into a 360 view: first/last seen, counts by type, recency, derived consent,
// tags (from #12), and a 0-100 engagement score with recency decay. Other departments emit events;
// this is the read-side aggregate. Pairs with contacts #12, consent #38, analytics #9, alerts #28.
//
// SAFETY: JSON-backed; counts/metadata only (message bodies + secrets dropped at ingest, phone/
// email values redacted). Contacts masked in views. This module never sends.

const { config, EVENT_WEIGHTS } = require('./config');
const timeline = require('./timeline');

module.exports = {
 config, EVENT_WEIGHTS,
 store: require('./store'),
 privacy: require('./privacy'),
 timeline,
 engagement: require('./engagement'),
 profile: require('./profile'),
 doctor: require('./doctor'),
 // convenience
 track: timeline.track,
};
