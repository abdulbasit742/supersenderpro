// lib/booking/notify.js — Single outbound hook for booking confirmations + reminders to the
// customer. Draft-only until a notifier is wired AND live messages are enabled. Respects consent
// (#38) when present so an opted-out contact is never messaged. Target masked in returned payloads.

const { config } = require('./config');
const { maskContact } = require('./privacy');

let consentLib = null; try { consentLib = require('../consentCenter'); } catch (_e) { consentLib = null; }
let _notifier = null;
function setNotifier(fn) { _notifier = (typeof fn === 'function') ? fn : null; return !!_notifier; }
function hasNotifier() { return !!_notifier; }

async function dispatch(target, message, opts = {}) {
 if (config.respectConsent && consentLib && target) {
 try { if (!consentLib.canSend(target).allowed) return { sent: false, blocked: true, reason: 'consent', to: maskContact(target) }; } catch (_e) { /* non-fatal */ }
 }
 if (!config.effective.liveMessages || !_notifier) return { sent: false, draft: true, to: maskContact(target), preview: message };
 try { const r = await _notifier(target, message, opts); return { sent: true, to: maskContact(target), result: r || null }; }
 catch (e) { return { sent: false, error: e.message, to: maskContact(target) }; }
}

module.exports = { setNotifier, hasNotifier, dispatch };
