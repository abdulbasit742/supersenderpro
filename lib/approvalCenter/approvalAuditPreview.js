  'use strict';

  /** Approval Center — narrow audit preview log (masked, append-only, bounded). */

  const store = require('./store');
  const { redactDeep } = require('./redactor');

  function record(event, details) {
    const data = store.readJson(store.PATHS.audit, { events: [] });
    const events = Array.isArray(data.events) ? data.events : [];
    events.unshift({ at: new Date().toISOString(), event: String(event || 'event').slice(0, 60), details:
  redactDeep(details || {}) });
    if (events.length > 5000) events.length = 5000;
    store.writeJson(store.PATHS.audit, { events, updatedAt: new Date().toISOString() });
    return events[0];
  }
  function list(limit) { const data = store.readJson(store.PATHS.audit, { events: [] }); return (Array.isArray(data.events)
  ? data.events : []).slice(0, Number.isFinite(limit) ? limit : 200); }


  module.exports = { record, list };
