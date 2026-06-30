// lib/broadcast/notify.js — outbound bridge (draft-only until wired)
// Looks for a shared notifier; if none present, returns a no-op result so the
// engine records a draft rather than throwing.
'use strict';

function send({ tenantId, phone, message }) {
  try {
    // eslint-disable-next-line global-require
    const notifier = require('../notify');
    if (notifier && typeof notifier.sendMessage === 'function') {
      return notifier.sendMessage({ tenantId, phone, message });
    }
  } catch (_) {}
  // No notifier wired — advisory no-op.
  return { ok: false, error: 'no notifier wired (draft-only)' };
}

module.exports = { send };
