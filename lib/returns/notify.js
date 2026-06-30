// lib/returns/notify.js
// Customer-facing return updates. DRAFT-ONLY by default.
// Only attempts a real send when config.notifyEnabled is true AND a notifier
// (the alert center, dept #28) is available. Otherwise returns the draft.

'use strict';

const config = require('./config');
const { maskCustomer } = require('./privacy');

function buildMessage(rec) {
  const id = rec.id;
  switch (rec.status) {
    case 'approved':
      return `Your return ${id} has been approved. Please ship the item(s) back.`;
    case 'received':
      return `We've received your returned item(s) for ${id}. Processing your refund now.`;
    case 'refunded':
      return `Your refund for ${id} has been processed.`;
    case 'rejected':
      return `Unfortunately your return ${id} could not be approved.`;
    default:
      return `Update on your return ${id}: status is now ${rec.status}.`;
  }
}

// notifier is optional; when absent we degrade to draft-only (no-op send).
function notify(rec, notifier) {
  const draft = {
    to: maskCustomer(rec.customer),
    rmaId: rec.id,
    status: rec.status,
    message: buildMessage(rec),
    sent: false,
    draftOnly: true
  };

  if (!config.notifyEnabled || !notifier || typeof notifier.send !== 'function') {
    return draft;
  }

  try {
    notifier.send({
      channel: 'return-updates',
      customer: rec.customer,
      text: draft.message
    });
    return { ...draft, sent: true, draftOnly: false };
  } catch (e) {
    return { ...draft, sent: false, error: e.message };
  }
}

module.exports = { buildMessage, notify };
