// lib/surveys/responseParser.js — Interpret an inbound reply against an open survey ask. For nps
// (0-10) and csat (1-5) we extract the first integer in range; for poll we match an option index
// or label; for text we take the trimmed message. Returns { ok, value, raw, reason } so the engine
// can accept or reject (e.g. out-of-range) without guessing.

function _firstInt(text) {
 const m = String(text || '').match(/-?\d+/);
 return m ? parseInt(m[0], 10) : null;
}

function parse(survey, text) {
 const raw = String(text == null ? '' : text).trim();
 if (survey.type === 'nps') {
 const n = _firstInt(raw);
 if (n === null) return { ok: false, reason: 'no number found', raw };
 if (n < 0 || n > 10) return { ok: false, reason: 'out of range 0-10', raw };
 return { ok: true, value: n, raw };
 }
 if (survey.type === 'csat') {
 const n = _firstInt(raw);
 if (n === null) return { ok: false, reason: 'no number found', raw };
 if (n < 1 || n > 5) return { ok: false, reason: 'out of range 1-5', raw };
 return { ok: true, value: n, raw };
 }
 if (survey.type === 'poll') {
 const opts = survey.options || [];
 const n = _firstInt(raw);
 if (n !== null && n >= 1 && n <= opts.length) return { ok: true, value: opts[n - 1], optionIndex: n - 1, raw };
 const lower = raw.toLowerCase();
 const idx = opts.findIndex((o) => String(o).toLowerCase() === lower);
 if (idx >= 0) return { ok: true, value: opts[idx], optionIndex: idx, raw };
 return { ok: false, reason: 'no matching option', raw };
 }
 // text survey: any non-empty message is a valid response
 if (!raw) return { ok: false, reason: 'empty', raw };
 return { ok: true, value: raw, raw };
}

module.exports = { parse };
