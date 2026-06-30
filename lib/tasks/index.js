// lib/tasks/index.js — Tasks & Follow-ups (barrel export).
//
// Actionable internal to-dos tied to a contact/ticket: create a follow-up with a due date,
// priority, and assignee; move it through open -> in_progress -> done/cancelled; detect overdue +
// due-soon; and on a tick fire (draft-only) reminders to the assignee plus emit 'task.overdue'
// into alerts #28 / automation #48. Pairs with team routing #44 (assignee = agent), support inbox
// #3 (ticketId link), and customer 360 #46 (contact link).
//
// SAFETY: JSON-backed; internal team tool — never messages customers. Reminder dispatch is
// DRAFT-ONLY until TASKS_LIVE_REMINDERS=true AND a notifier is wired via
// require('./lib/tasks').setNotifier(fn). Contacts masked in views. Tasks cancelled/done, never
// hard-deleted.

const { config, STATUSES, PRIORITIES } = require('./config');
const notify = require('./notify');

module.exports = {
 config, STATUSES, PRIORITIES,
 store: require('./store'),
 privacy: require('./privacy'),
 taskStore: require('./taskStore'),
 notify,
 reminders: require('./reminders'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
