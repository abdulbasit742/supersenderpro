'use strict';
/** Pulls pilot feedback in as ticket-shaped previews (read-only). Pilot Ops owns the data. */
const { tryRequire, safe } = require('./_base');
const feedbackStore = tryRequire(['lib/pilotOps/feedbackStore']);
function summary() {
  if (!feedbackStore) return { available: false };
  const items = safe(() => (typeof feedbackStore.list === 'function' ? feedbackStore.list() : []), []) || [];
  return { available: true, openFeedback: items.filter((f) => f.status && !['resolved', 'archived',
'rejected'].includes(f.status)).length, items: items.slice(0, 10).map((f) => ({ id: f.id, type: f.type, severity:
f.severity, status: f.status })) };
}
module.exports = { summary };
