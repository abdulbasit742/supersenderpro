// lib/aiAutoReply/notify.js — Single outbound hook for auto-replies. Draft-only until a notifier
// is wired AND live send is enabled (and the kill switch is off). Targets masked in payloads.

const { config } = require('./config');
const { maskContact } = require('./privacy');

let _notifier = null;
function setNotifier(fn) { _notifier = (typeof fn === 'function') ? fn : null; return !!_notifier; }
function hasNotifier() { return !!_notifier; }

async function dispatch(target, message, opts = {}) {
 if (!config.effective.liveSend || !_notifier) return { sent: false, draft: true, to: maskContact(target), preview: message };
 try { const r = await _notifier(target, message, opts); return { sent: true, to: maskContact(target), result: r || null }; }
 catch (e) { return { sent: false, error: e.message, to: maskContact(target) }; }
}

module.exports = { setNotifier, hasNotifier, dispatch };
