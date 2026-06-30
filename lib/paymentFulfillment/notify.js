// lib/paymentFulfillment/notify.js — Single outbound notification hook.
// Receipts + reminders route through dispatch(). Until a notifier is wired AND
// PAYMENT_FULFILLMENT_LIVE_NOTIFICATIONS=true (+ dry-run off), everything is a draft
// preview — nothing is sent. Targets are masked in all returned payloads.

const { config } = require('./config');

let _notifier = null;

// notifier signature: async (target, message, opts) => any
function setNotifier(fn) { _notifier = (typeof fn === 'function') ? fn : null; return !!_notifier; }
function hasNotifier() { return !!_notifier; }

function mask(t) {
 if (!t) return null;
 const s = String(t);
 if (s.includes('@')) { const [u, d] = s.split('@'); return (u.slice(0, 2) || '') + '***@' + (d || ''); }
 if (s.length <= 4) return '****';
 return s.slice(0, 3) + '****' + s.slice(-2);
}

async function dispatch(target, message, opts = {}) {
 if (!config.effective.liveNotifications || !_notifier) {
 return { sent: false, dryRun: true, target: mask(target), preview: message };
 }
 try {
 const r = await _notifier(target, message, opts);
 return { sent: true, target: mask(target), result: r || null };
 } catch (e) {
 return { sent: false, error: e.message, target: mask(target) };
 }
}

module.exports = { setNotifier, hasNotifier, dispatch, mask };
