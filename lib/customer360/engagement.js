// lib/customer360/engagement.js — Compute a 0-100 engagement score from a contact's events using
// per-type weights with exponential recency decay (recent activity counts more). A single opt_out
// caps the score low (the contact asked to stop). Pure function over events.

const { config, EVENT_WEIGHTS } = require('./config');

const DAY = 24 * 60 * 60 * 1000;

function score(events, refNow = Date.now()) {
 if (!events || !events.length) return { score: 0, rating: 'cold', signals: 0 };
 const hl = Math.max(1, config.recencyHalfLifeDays) * DAY;
 let raw = 0;
 let optedOut = false;
 for (const e of events) {
 const w = EVENT_WEIGHTS[e.type] !== undefined ? EVENT_WEIGHTS[e.type] : EVENT_WEIGHTS.custom;
 if (e.type === 'opt_out') optedOut = true;
 const age = Math.max(0, refNow - (Date.parse(e.at) || refNow));
 const decay = Math.pow(0.5, age / hl); // 1.0 now -> 0.5 at one half-life
 raw += w * decay;
 }
 // Squash raw into 0-100 with a soft curve; opt-out hard-caps at 5.
 let s = Math.round(100 * (1 - Math.exp(-Math.max(0, raw) / 25)));
 if (optedOut) s = Math.min(s, 5);
 s = Math.max(0, Math.min(100, s));
 const rating = s >= 70 ? 'hot' : (s >= 35 ? 'warm' : 'cold');
 return { score: s, rating, signals: events.length };
}

module.exports = { score };
