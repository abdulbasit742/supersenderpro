// lib/supportInbox/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.tickets));
 ok('canned_replies_present', Array.isArray(d.cannedReplies));
 ok('draft_safe_default', config.effective.liveReplies === false || config.liveReplies === true,
 config.effective.liveReplies ? 'live replies explicitly enabled' : 'draft-only (safe)');
 return {
 ok: checks.every((c) => c.pass),
 posture: {
 enabled: config.enabled,
 liveReplies: config.effective.liveReplies,
 firstResponseSlaMins: config.firstResponseSlaMins,
 resolutionSlaMins: config.resolutionSlaMins,
 },
 counts: { tickets: d.tickets.length, cannedReplies: d.cannedReplies.length },
 checks,
 };
}

module.exports = { run };
