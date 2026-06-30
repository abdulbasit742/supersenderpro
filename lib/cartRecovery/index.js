'use strict';
// #80 Abandoned Cart Recovery — barrel + high-level helpers.
const config = require('./config');
const store = require('./store');
const privacy = require('./privacy');
const detector = require('./detector');
const recoverySequence = require('./recoverySequence');
const doctor = require('./doctor');

function track(args) { const db = store.load(); const res = detector.track(db, args); store.save(db); return res; }
function markPaid(args) { const db = store.load(); const res = detector.markPaid(db, args); store.save(db); return res; }

// Run a full recovery cycle: detect abandoned + draft due nudges. Returns drafts (not sent).
function runCycle(atMs) {
  if (!config.enabled) return { skipped: 'disabled', drafts: [] };
  const db = store.load();
  const flipped = detector.detectAbandoned(db);
  const drafts = recoverySequence.processDue(db, atMs);
  store.save(db);
  return { abandoned: flipped.length, drafts };
}

// Hooks (wired by orders #63 / webhook #51 if present).
function onCartActivity(evt) { return track(evt); }
function onOrderPaid(evt) { return markPaid({ tenantId: evt.tenantId, cartId: evt.cartId }); }

module.exports = { config, store, privacy, detector, recoverySequence, doctor, track, markPaid, runCycle, onCartActivity, onOrderPaid };
