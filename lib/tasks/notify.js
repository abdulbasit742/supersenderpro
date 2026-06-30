// lib/tasks/notify.js — Single outbound hook for task reminders to the assignee (an internal
// agent/owner, not a customer). Draft-only until a notifier is wired AND live reminders enabled.

const { config } = require('./config');

let _notifier = null;
function setNotifier(fn) { _notifier = (typeof fn === 'function') ? fn : null; return !!_notifier; }
function hasNotifier() { return !!_notifier; }

async function dispatch(assignee, message, opts = {}) {
 if (!config.effective.liveReminders || !_notifier) return { sent: false, draft: true, to: assignee || null, preview: message };
 try { const r = await _notifier(assignee, message, opts); return { sent: true, to: assignee || null, result: r || null }; }
 catch (e) { return { sent: false, error: e.message, to: assignee || null }; }
}

module.exports = { setNotifier, hasNotifier, dispatch };
