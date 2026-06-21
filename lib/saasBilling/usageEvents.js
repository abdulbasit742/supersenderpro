'use strict';


/** SaaS Billing — usage event log (JSON file). Redacted; preview only. */

const crypto = require('crypto');
const store = require('./store');
const redactor = require('./redactor');


const EVENTS_PATH = process.env.SAAS_BILLING_EVENTS_PATH || 'data/saas-billing-events.json';
const MAX = parseInt(process.env.SAAS_BILLING_MAX_EVENTS, 10) || 1000;


function read() { return store.read(EVENTS_PATH, { events: [] }); }
function write(db) { try { if (db.events.length > MAX) db.events = db.events.slice(-MAX); return store.write(EVENTS_PATH,
db); } catch (e) { return false; } }

function record(evt) {
  const safe = redactor.redact({ id: 'uevt_' + crypto.randomBytes(5).toString('hex'), tenantId: (evt && evt.tenantId) ||
'preview', meter: evt && evt.meter, amount: Number(evt && evt.amount) || 0, dryRun: true, at: new Date().toISOString()
});
     const db = read(); db.events.push(safe); write(db); return safe;
}
function list(limit) { const items = read().events.slice().reverse(); return typeof limit === 'number' ? items.slice(0,
limit) : items; }
function status() { return { path: EVENTS_PATH, writable: store.writable(EVENTS_PATH), events: read().events.length,
maxEvents: MAX }; }


module.exports = { record, list, status };
