// lib/surveys/surveyEngine.js — Core: define surveys, send (draft) a survey prompt to a contact
// while opening an 'ask' window, capture inbound replies against the open ask (validated by type),
// and score results. Respects consent #38 on send when present. Records responses once per ask.
//
// A survey: { id, name, type(nps|csat|poll|text), question, options?(poll), createdAt }.
// An open ask: openAsks[contact] = { surveyId, sentAt }. A reply within the window is matched to
// that survey, parsed, recorded, and the ask is cleared.

const store = require('./store');
const { config, TYPES } = require('./config');
const parser = require('./responseParser');
const scoring = require('./scoring');
const notify = require('./notify');
const { maskContact } = require('./privacy');

let consentLib = null; try { consentLib = require('../consentCenter'); } catch (_e) { consentLib = null; }

const HOUR = 3600 * 1000;

function _defaultQuestion(type) {
 if (type === 'nps') return 'On a scale of 0-10, how likely are you to recommend us to a friend? (reply with a number)';
 if (type === 'csat') return 'How satisfied are you with our service? Reply 1 (bad) to 5 (great).';
 if (type === 'poll') return 'Please pick an option by replying with its number.';
 return 'We\'d love your feedback! Reply to this message.';
}

function publicView(s) {
 if (!s) return null;
 return { id: s.id, name: s.name, type: s.type, question: s.question, options: s.options || null, createdAt: s.createdAt };
}

function create({ name, type = 'nps', question, options } = {}) {
 if (!TYPES.includes(type)) throw new Error('type must be one of: ' + TYPES.join(', '));
 if (type === 'poll' && (!Array.isArray(options) || options.length < 2)) throw new Error('poll requires at least 2 options');
 const d = store.load();
 const s = {
 id: store.genId('svy'), name: name || (type.toUpperCase() + ' survey'), type,
 question: question || _defaultQuestion(type), options: type === 'poll' ? options.map(String) : null,
 createdAt: store.nowIso(),
 };
 d.surveys.push(s); store.save(d);
 return publicView(s);
}

function _get(d, id) { return d.surveys.find((s) => s.id === id); }

function _renderPrompt(s) {
 if (s.type === 'poll') return `${s.question}\n` + (s.options || []).map((o, i) => `${i + 1}. ${o}`).join('\n');
 return s.question;
}

// Send a survey to a contact (draft-only unless live). Opens an ask window for their reply.
async function send(surveyId, contact, refNow = Date.now()) {
 if (!contact) throw new Error('contact is required');
 const d = store.load();
 const s = _get(d, surveyId);
 if (!s) throw new Error('survey not found');
 if (config.respectConsent && consentLib) {
 try { if (!consentLib.canSend(contact).allowed) return { sent: false, blocked: true, reason: 'consent', to: maskContact(contact) }; } catch (_e) { /* non-fatal */ }
 }
 const message = _renderPrompt(s);
 const res = await notify.dispatch(contact, message, { kind: 'survey', surveyId });
 d.openAsks[String(contact)] = { surveyId, sentAt: new Date(refNow).toISOString() };
 store.save(d);
 return { surveyId, to: maskContact(contact), sent: res.sent, draft: !res.sent, preview: res.preview || message };
}

// Capture an inbound reply. If the contact has an open ask within the window, parse + record it.
function capture({ contact, text } = {}, refNow = Date.now()) {
 if (!contact) throw new Error('contact is required');
 const d = store.load();
 const ask = d.openAsks[String(contact)];
 if (!ask) return { matched: false, reason: 'no open survey for contact' };
 if (refNow - Date.parse(ask.sentAt) > config.responseWindowHours * HOUR) {
 delete d.openAsks[String(contact)]; store.save(d);
 return { matched: false, reason: 'response window expired' };
 }
 const s = _get(d, ask.surveyId);
 if (!s) { delete d.openAsks[String(contact)]; store.save(d); return { matched: false, reason: 'survey gone' }; }
 const parsed = parser.parse(s, text);
 if (!parsed.ok) return { matched: true, accepted: false, reason: parsed.reason, surveyId: s.id };
 const response = {
 id: store.genId('resp'), surveyId: s.id, type: s.type,
 contactMasked: maskContact(contact), value: parsed.value, raw: parsed.raw,
 at: new Date(refNow).toISOString(),
 };
 d.responses.push(response);
 delete d.openAsks[String(contact)]; // ask answered
 store.save(d);
 return { matched: true, accepted: true, surveyId: s.id, type: s.type, value: parsed.value };
}

function _valuesFor(d, surveyId) { return d.responses.filter((r) => r.surveyId === surveyId).map((r) => r.value); }

function results(surveyId) {
 const d = store.load();
 const s = _get(d, surveyId);
 if (!s) return null;
 const values = _valuesFor(d, surveyId);
 let scored;
 if (s.type === 'nps') scored = scoring.nps(values.map(Number));
 else if (s.type === 'csat') scored = scoring.csat(values.map(Number));
 else if (s.type === 'poll') scored = scoring.poll(values);
 else scored = { responses: values.length, sample: values.slice(-10) };
 // day time series of response counts
 const series = {};
 for (const r of d.responses.filter((x) => x.surveyId === surveyId)) { const day = String(r.at).slice(0, 10); series[day] = (series[day] || 0) + 1; }
 return { surveyId, name: s.name, type: s.type, question: s.question, ...scored, timeSeries: Object.entries(series).map(([bucket, count]) => ({ bucket, count })).sort((a, b) => (a.bucket < b.bucket ? -1 : 1)) };
}

function list() { return store.load().surveys.map(publicView); }
function get(id) { return publicView(_get(store.load(), id)); }
function responses(surveyId, limit = 100) { return store.load().responses.filter((r) => r.surveyId === surveyId).slice(-limit).reverse(); }

function overview() {
 const d = store.load();
 return { generatedAt: store.nowIso(), liveSend: config.effective.liveSend, consentRespected: config.respectConsent && !!consentLib, cards: { surveys: d.surveys.length, openAsks: Object.keys(d.openAsks).length, responses: d.responses.length } };
}

module.exports = { create, send, capture, results, list, get, responses, overview, publicView };
