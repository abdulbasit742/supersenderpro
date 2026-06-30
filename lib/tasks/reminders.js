// lib/tasks/reminders.js — Compute overdue + due-soon tasks and fire due reminders on a tick.
// A reminder fires once per task (tracked in remindersFired) when the task is past due (or within
// the due-soon window for high/urgent tasks) and still open/in_progress. Reminder delivery is
// draft-only unless live; overdue tasks optionally fan 'task.overdue' into alerts #28 / automation #48.

const store = require('./store');
const { config } = require('./config');
const taskStore = require('./taskStore');
const notify = require('./notify');

let alerts = null; try { alerts = require('../alertCenter'); } catch (_e) { alerts = null; }
let automation = null; try { automation = require('../automationRules'); } catch (_e) { automation = null; }

const HOUR = 3600 * 1000;
const OPEN = ['open', 'in_progress'];

function _isOverdue(t, refNow) { return t.dueAt && OPEN.includes(t.status) && Date.parse(t.dueAt) < refNow; }
function _isDueSoon(t, refNow) { return t.dueAt && OPEN.includes(t.status) && Date.parse(t.dueAt) >= refNow && (Date.parse(t.dueAt) - refNow) <= config.dueSoonHours * HOUR; }

function overdue(refNow = Date.now()) { return taskStore.all().filter((t) => _isOverdue(t, refNow)).map(taskStore.publicView); }
function dueSoon(refNow = Date.now()) { return taskStore.all().filter((t) => _isDueSoon(t, refNow)).map(taskStore.publicView); }

function _reminderText(t) {
 const when = t.dueAt ? new Date(t.dueAt).toISOString() : 'no due date';
 return `Reminder: task "${t.title}" (${t.priority}) is due ${when}.` + (t.ticketId ? ` [ticket ${t.ticketId}]` : '');
}

// Fire reminders for tasks that are overdue or (for high/urgent) due-soon, once each.
async function tick(refNow = Date.now()) {
 const d = store.load();
 const results = [];
 for (const t of d.tasks) {
 if (!OPEN.includes(t.status) || !t.dueAt) continue;
 const overdueNow = Date.parse(t.dueAt) < refNow;
 const dueSoonHigh = !overdueNow && (Date.parse(t.dueAt) - refNow) <= config.dueSoonHours * HOUR && ['high', 'urgent'].includes(t.priority);
 if (!overdueNow && !dueSoonHigh) continue;
 if (d.remindersFired[t.id]) continue; // already reminded for this due date

 const res = await notify.dispatch(t.assignee, _reminderText(t), { kind: 'task_reminder', taskId: t.id });
 d.remindersFired[t.id] = store.nowIso();

 // Fan overdue tasks into alerts/automation (best-effort, non-fatal).
 let fan = {};
 if (overdueNow && config.fanOverdue) {
 const payload = { taskId: t.id, title: t.title, priority: t.priority, assignee: t.assignee, contact: t.contact, ticket: t.ticketId };
 if (alerts) { try { fan.alerts = await alerts.emit('task.overdue', payload); } catch (e) { fan.alertsError = e.message; } }
 if (automation) { try { fan.automation = await automation.emit('task.overdue', payload); } catch (e) { fan.automationError = e.message; } }
 }
 results.push({ taskId: t.id, overdue: overdueNow, sent: res.sent, draft: !res.sent, preview: res.preview || null, fan });
 }
 store.save(d);
 return { processed: results.length, sent: results.filter((r) => r.sent).length, drafted: results.filter((r) => !r.sent).length, results };
}

function overview(refNow = Date.now()) {
 const tasks = taskStore.all();
 const open = tasks.filter((t) => OPEN.includes(t.status));
 return {
 generatedAt: store.nowIso(),
 liveReminders: config.effective.liveReminders,
 cards: {
 total: tasks.length,
 open: open.length,
 overdue: tasks.filter((t) => _isOverdue(t, refNow)).length,
 dueSoon: tasks.filter((t) => _isDueSoon(t, refNow)).length,
 done: tasks.filter((t) => t.status === 'done').length,
 unassigned: open.filter((t) => !t.assignee).length,
 },
 };
}

module.exports = { overdue, dueSoon, tick, overview };
