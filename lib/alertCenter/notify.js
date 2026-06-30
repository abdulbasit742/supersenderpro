// lib/alertCenter/notify.js — Single outbound hook for the 'owner' channel. Draft-only until a
// notifier is wired AND live delivery is enabled. Recipient masked in returned payloads.

const { config } = require('./config');

let _notifier = null;
function setNotifier(fn) { _notifier = (typeof fn === 'function') ? fn : null; return !!_notifier; }
function hasNotifier() { return !!_notifier; }
function _mask(t) { if (!t) return null; const s = String(t); if (s.includes('@')) { const [u, d] = s.split('@'); return (u.slice(0, 2) || '') + '***@' + (d || ''); } return s.length <= 4 ? '****' : s.slice(0, 3) + '****' + s.slice(-2); }

async function dispatch(target, message, opts = {}) {
 if (!config.effective.liveDelivery || !_notifier) return { sent: false, draft: true, to: _mask(target), preview: message };
 try { const r = await _notifier(target, message, opts); return { sent: true, to: _mask(target), result: r || null }; }
 catch (e) { return { sent: false, error: e.message, to: _mask(target) }; }
}

module.exports = { setNotifier, hasNotifier, dispatch };
