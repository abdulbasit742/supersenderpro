#!/usr/bin/env node
// tests/smoke/tasksSmoke.js — Smoke test for sorting + filters + reschedule. Run: npm run tasks:smoke

const tk = require('../../lib/tasks');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!tk.taskStore, 'store present');

 // List sorts by due date soonest-first.
 const soon = new Date(Date.now() + 3600 * 1000).toISOString();
 const later = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
 const a = tk.taskStore.create({ title: 'Later task', assignee: 'sm-1', dueAt: later });
 const b = tk.taskStore.create({ title: 'Sooner task', assignee: 'sm-1', dueAt: soon });
 const list = tk.taskStore.list({ assignee: 'sm-1' });
 const ai = list.findIndex((x) => x.id === a.id); const bi = list.findIndex((x) => x.id === b.id);
 t(bi < ai, 'tasks sort soonest-due first');

 // Filter by ticketId.
 tk.taskStore.create({ title: 'Ticket-linked', ticketId: 'TKT-SM', assignee: 'sm-2' });
 const byTicket = tk.taskStore.list({ ticketId: 'TKT-SM' });
 t(byTicket.length >= 1 && byTicket[0].ticketId === 'TKT-SM', 'filter by ticketId works');

 // Reschedule clears the fired flag so a reminder can fire again for the new due date.
 const past = new Date(Date.now() - 3600 * 1000).toISOString();
 const c = tk.taskStore.create({ title: 'Reschedule me', assignee: 'sm-3', priority: 'high', dueAt: past });
 await tk.reminders.tick();                 // fires once
 const again1 = await tk.reminders.tick();  // should not re-fire
 t(!again1.results.find((r) => r.taskId === c.id), 'no duplicate reminder before reschedule');
 tk.taskStore.update(c.id, { dueAt: new Date(Date.now() - 60 * 1000).toISOString() }); // new past due -> reschedule
 const again2 = await tk.reminders.tick();
 t(!!again2.results.find((r) => r.taskId === c.id), 'rescheduling lets the reminder fire again');

 const ov = tk.reminders.overview();
 t(typeof ov.cards.overdue === 'number' && typeof ov.cards.dueSoon === 'number', 'overview returns overdue + due-soon counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
