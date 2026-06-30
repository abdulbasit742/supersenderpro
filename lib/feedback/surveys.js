'use strict';
/**
 * surveys.js — Feedback Feature #1: NPS / CSAT / open surveys over WhatsApp.
 *
 * Knowing if customers are happy is gold. This sends a one-question survey (NPS 0-10, CSAT 1-5, or
 * open text) after an event (order delivered, ticket resolved), records the reply, and computes the
 * headline score (NPS = %promoters - %detractors; CSAT = average). Responses also land on the
 * Customer 360 timeline so sentiment lives with the profile.
 *
 * Decoupled: sender + 360 recorder injected. Storage: JSON (data/surveys.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'surveys.json');
const TYPES = ['nps', 'csat', 'open'];

let sender = null;        // async (phone, text) => any
let recordEvent = null;   // (phone, ev) => void   (customer360)
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }
function setRecorder(fn) { recordEvent = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { surveys: [], responses: [] }; }
  catch { return { surveys: [], responses: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

function createSurvey(opts = {}) {
  if (!TYPES.includes(opts.type)) throw new Error(`type must be one of: ${TYPES.join(', ')}`);
  if (!opts.question) throw new Error('question required');
  const data = load();
  const survey = {
    id: `SURV-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name || opts.type.toUpperCase(),
    type: opts.type,
    question: opts.question,
    createdAt: nowIso()
  };
  data.surveys.push(survey);
  save(data);
  return survey;
}

function listSurveys() { return load().surveys; }
function getSurvey(id) { return load().surveys.find(s => s.id === id) || null; }

function scalePrompt(survey) {
  if (survey.type === 'nps') return `${survey.question}\n\nReply 0-10 (0 = not at all, 10 = extremely likely).`;
  if (survey.type === 'csat') return `${survey.question}\n\nReply 1-5 (1 = very unhappy, 5 = very happy).`;
  return survey.question;
}

/** Send a survey to a contact. */
async function send(surveyId, phone) {
  const survey = getSurvey(surveyId);
  if (!survey) throw new Error('survey not found');
  if (!sender) throw new Error('no sender wired');
  const p = normPhone(phone);
  const to = p.includes('@') ? p : `${p}@c.us`;
  await sender(to, scalePrompt(survey));
  return { sent: true, surveyId, phone: p };
}

/** Record a response (parses a number for nps/csat). */
function recordResponse(surveyId, phone, raw) {
  const survey = getSurvey(surveyId);
  if (!survey) return null;
  const p = normPhone(phone);
  let value = raw;
  if (survey.type === 'nps' || survey.type === 'csat') {
    const n = parseInt(String(raw).trim(), 10);
    if (Number.isNaN(n)) return { ok: false, reason: 'expected a number' };
    const max = survey.type === 'nps' ? 10 : 5;
    if (n < 0 || n > max) return { ok: false, reason: `expected 0-${max}` };
    value = n;
  }
  const data = load();
  data.responses.push({ surveyId, phone: p, type: survey.type, value, at: nowIso() });
  save(data);
  if (recordEvent) { try { recordEvent(p, { type: 'note', text: `${survey.name} response: ${value}` }); } catch { /* ignore */ } }
  return { ok: true, value };
}

/** Score a survey: NPS or CSAT average + counts. */
function results(surveyId) {
  const survey = getSurvey(surveyId);
  if (!survey) return null;
  const data = load();
  const resp = data.responses.filter(r => r.surveyId === surveyId);
  const n = resp.length;
  if (survey.type === 'nps') {
    const promoters = resp.filter(r => r.value >= 9).length;
    const detractors = resp.filter(r => r.value <= 6).length;
    const nps = n ? Math.round(((promoters - detractors) / n) * 100) : 0;
    return { type: 'nps', responses: n, promoters, passives: n - promoters - detractors, detractors, nps };
  }
  if (survey.type === 'csat') {
    const avg = n ? Math.round((resp.reduce((s, r) => s + r.value, 0) / n) * 100) / 100 : 0;
    return { type: 'csat', responses: n, average: avg };
  }
  return { type: 'open', responses: n, samples: resp.slice(-20).map(r => r.value) };
}

module.exports = { TYPES, setSender, setRecorder, createSurvey, listSurveys, getSurvey, send, recordResponse, results };
