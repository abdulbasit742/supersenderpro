// lib/supportInbox/notify.js — Single outbound hook for support replies. Draft-only until a
// notifier is wired AND live replies are enabled. Targets are masked in returned payloads.

const { config } = require('./config');
const { maskContact } = require('./privacy');

let _notifier = null;
function setNotifier(fn) { _notifier = (typeof fn === 'function') ? fn : null; return !!_notifier; }
function hasNotifier() { return !!_notifier; }

async function dispatch(target, message, opts = {}) {
 if (!config.effective.liveReplies || !_notifier) {
 return { sent: false, draft: true, to: maskContact(target), preview: message };
 }
 try { const r = await _notifier(target, message, opts); return { sent: true, to: maskContact(target), result: r || null }; }
 catch (e) { return { sent: false, error: e.message, to: maskContact(target) }; }
}

module.exports = { setNotifier, hasNotifier, dispatch };
