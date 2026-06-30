// lib/surveys/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, TYPES } = require('./config');
const store = require('./store');
const parser = require('./responseParser');
const scoring = require('./scoring');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.surveys) && Array.isArray(d.responses));
 ok('send_safe_default', config.effective.liveSend === false || config.liveSend === true, config.effective.liveSend ? 'live send enabled' : 'draft-only (safe)');
 // parser + scoring sanity
 const p = parser.parse({ type: 'nps' }, 'I would say 9 out of 10');
 ok('nps_parse_ok', p.ok && p.value === 9, 'extracts first in-range NPS number');
 const np = scoring.nps([10, 9, 9, 6, 0]);
 ok('nps_score_ok', np.score === Math.round(((3 / 5) - (2 / 5)) * 100), 'NPS = %promoters - %detractors');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, liveSend: config.effective.liveSend, types: TYPES, responseWindowHours: config.responseWindowHours, respectConsent: config.respectConsent },
 counts: { surveys: d.surveys.length, responses: d.responses.length, openAsks: Object.keys(d.openAsks).length },
 checks,
 };
}

module.exports = { run };
