'use strict';


/**
    * Pilot Ops — feedback / bug tracker (JSON file). Stores safe previews only;
    * raw private customer messages are NOT stored by default.
    */

const crypto = require('crypto');
const store = require('./store');
const privacy = require('./privacyGuard');


const FEEDBACK_PATH = process.env.PILOT_OPS_FEEDBACK_PATH || 'data/pilot-feedback.json';

const TYPES = ['bug', 'feature_request', 'confusion', 'pricing_feedback', 'onboarding_feedback', 'praise', 'complaint',
'support_question'];
const STATUSES = ['new', 'triaged', 'planned', 'in_progress', 'resolved', 'rejected', 'archived'];
const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];

function id() { return 'fb_' + crypto.randomBytes(6).toString('hex'); }
function now() { return new Date().toISOString(); }
function read() { return store.read(FEEDBACK_PATH, { items: [] }); }
function write(db) { return store.write(FEEDBACK_PATH, db); }

function normalize(input) {
  const i = input || {};
     return {
       id: i.id || id(),
         pilotId: i.pilotId || null,
         type: TYPES.indexOf(i.type) !== -1 ? i.type : 'support_question',
         title: i.title ? String(i.title).slice(0, 120) : 'Untitled',
         descriptionSafe: privacy.safePreview(i.description || i.descriptionSafe, 240),
         severity: SEVERITIES.indexOf(i.severity) !== -1 ? i.severity : 'low',
         status: STATUSES.indexOf(i.status) !== -1 ? i.status : 'new',
         source: i.source ? String(i.source).slice(0, 40) : 'admin',
         relatedModule: i.relatedModule || null,
         suggestedFix: i.suggestedFix ? String(i.suggestedFix).slice(0, 300) : null,
         createdAt: i.createdAt || now(),
         updatedAt: now(),
     };
}

function create(input) { const db = read(); const rec = normalize(input); db.items.push(rec); write(db); return rec; }
function list() { return read().items.slice(); }
function get(fid) { return read().items.find(function (x) { return x.id === fid; }) || null; }
function update(fid, patch) {

    const db = read();
    const idx = db.items.findIndex(function (x) { return x.id === fid; });
    if (idx === -1) return null;
  db.items[idx] = normalize(Object.assign({}, db.items[idx], patch || {}, { id: fid, createdAt: db.items[idx].createdAt
}));
    write(db);
    return db.items[idx];
}
function statusInfo() { return { path: FEEDBACK_PATH, writable: store.writable(FEEDBACK_PATH), items: read().items.length
}; }

module.exports = { TYPES, STATUSES, SEVERITIES, create, list, get, update, normalize, statusInfo };
