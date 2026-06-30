// lib/alertCenter/alertEngine.js — The core. emit(event, payload) finds matching active rules,
// evaluates each rule's safe condition, applies per-rule throttle/dedupe, renders the alert
// message, records it to the in-app feed, and (for the 'owner' channel) dispatches via the
// notifier (draft-only unless live delivery is enabled). Returns what fired + what was throttled.

const store = require('./store');
const { config } = require('./config');
const ruleStore = require('./ruleStore');
const { matches } = require('./conditionMatcher');
const notify = require('./notify');

const MIN = 60 * 1000;

function _render(template, ctx) {
 return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (ctx[k] !== undefined && ctx[k] !== null ? String(ctx[k]) : ''));
}
function _throttleKey(ruleId, ctx) {
 // Dedupe key: rule + a stable subset of the payload (target/ticket/tenantId) when present.
 const disc = ctx.ticket || ctx.target || ctx.tenantId || '';
 return `${ruleId}:${disc}`;
}
function _throttled(d, key, throttleMinutes, refNow) {
 if (!throttleMinutes) return false;
 const last = d.throttle[key];
 return last ? (refNow - Date.parse(last)) < throttleMinutes * MIN : false;
}

async function emit(event, payload = {}, refNow = Date.now()) {
 if (!config.enabled) return { event, fired: [], throttled: [], disabled: true };
 if (!event) throw new Error('event is required');
 const ctx = Object.assign({ event }, payload || {});
 const rules = ruleStore.forEvent(event);
 const d = store.load();
 const fired = []; const throttledOut = [];

 for (const rule of rules) {
 if (!matches(ctx, rule.condition)) continue;
 const key = _throttleKey(rule.id, ctx);
 if (_throttled(d, key, rule.throttleMinutes, refNow)) { throttledOut.push({ ruleId: rule.id, key }); continue; }

 const message = _render(rule.template, ctx);
 const alert = {
 id: store.genId('alert'), ruleId: rule.id, event, severity: rule.severity,
 channels: rule.channels, message, payload: ctx,
 read: false, at: store.nowIso(), deliveries: {},
 };
 // in-app channel: always record in the feed.
 if (rule.channels.includes('inapp')) alert.deliveries.inapp = { recorded: true };
 // owner channel: dispatch (draft-only unless live).
 if (rule.channels.includes('owner')) {
 const res = await notify.dispatch(payload.ownerTarget || null, `[${rule.severity.toUpperCase()}] ${message}`, { kind: 'alert', event, ruleId: rule.id });
 alert.deliveries.owner = { sent: res.sent, draft: !res.sent, preview: res.preview || message };
 }
 d.feed.push(alert);
 d.throttle[key] = alert.at;
 fired.push({ ruleId: rule.id, alertId: alert.id, severity: rule.severity, channels: rule.channels, sent: !!(alert.deliveries.owner && alert.deliveries.owner.sent) });
 }

 if (d.feed.length > config.maxFeed) d.feed = d.feed.slice(-config.maxFeed);
 store.save(d);
 return { event, fired, throttled: throttledOut };
}

function feed({ severity, event, unreadOnly, limit = 100 } = {}) {
 let items = store.load().feed.slice();
 if (severity) items = items.filter((a) => a.severity === severity);
 if (event) items = items.filter((a) => a.event === event);
 if (unreadOnly) items = items.filter((a) => !a.read);
 return items.slice().reverse().slice(0, limit).map((a) => ({ id: a.id, ruleId: a.ruleId, event: a.event, severity: a.severity, message: a.message, channels: a.channels, read: a.read, at: a.at, ownerDelivery: a.deliveries.owner || null }));
}
function markRead(id) { const d = store.load(); const a = d.feed.find((x) => x.id === id); if (!a) throw new Error('alert not found'); a.read = true; store.save(d); return { id, read: true }; }
function markAllRead() { const d = store.load(); let n = 0; d.feed.forEach((a) => { if (!a.read) { a.read = true; n += 1; } }); store.save(d); return { marked: n }; }

function overview() {
 const d = store.load();
 const bySev = (s) => d.feed.filter((a) => a.severity === s).length;
 return {
 generatedAt: store.nowIso(),
 liveDelivery: config.effective.liveDelivery,
 cards: {
 rules: d.rules.length, activeRules: d.rules.filter((r) => r.active !== false).length,
 alerts: d.feed.length, unread: d.feed.filter((a) => !a.read).length,
 critical: bySev('critical'), warning: bySev('warning'), info: bySev('info'),
 },
 };
}

// A compact digest of unread alerts grouped by severity (for a periodic summary).
function digest() {
 const d = store.load();
 const unread = d.feed.filter((a) => !a.read);
 const group = (s) => unread.filter((a) => a.severity === s).map((a) => a.message).slice(0, 20);
 return { generatedAt: store.nowIso(), unread: unread.length, critical: group('critical'), warning: group('warning'), info: group('info') };
}

module.exports = { emit, feed, markRead, markAllRead, overview, digest };
