#!/usr/bin/env node
// scripts/tasks-check.js — Offline safety + behavior check. Run: npm run tasks:check

const tk = require('../lib/tasks');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(tk && tk.taskStore, 'module loads');
 assert(tk.config.effective.liveReminders === false, 'reminders are draft-only by default (safe)');

 // Create a task linked to a contact + ticket.
 const past = new Date(Date.now() - 3600 * 1000).toISOString();
 const t = tk.taskStore.create({ title: 'Call back about refund', contact: '+923001234567', ticketId: 'TKT-9', assignee: 'agent-1', priority: 'high', dueAt: past });
 assert(t.id && t.status === 'open', 'task created as open');
 assert(t.contactMasked.indexOf('1234567') === -1, 'contact masked in task view');

 // Overdue detection.
 const od = tk.reminders.overdue();
 assert(od.find((x) => x.id === t.id), 'past-due open task is detected as overdue');

 // Tick fires a (drafted) reminder once, and fans overdue.
 const tick1 = await tk.reminders.tick();
 const fired = tick1.results.find((r) => r.taskId === t.id);
 assert(fired && fired.overdue === true, 'overdue task fires on tick');
 assert(fired.sent === false && fired.draft === true, 'reminder is drafted, not sent (safe default)');
 // Second tick should NOT re-fire the same task.
 const tick2 = await tk.reminders.tick();
 assert(!tick2.results.find((r) => r.taskId === t.id), 'reminder fires once per task (no duplicate)');

 // Status lifecycle.
 const done = tk.taskStore.setStatus(t.id, 'done');
 assert(done.status === 'done' && done.completedAt, 'task can be completed with a timestamp');
 assert(!tk.reminders.overdue().find((x) => x.id === t.id), 'completed task is no longer overdue');

 // Due-soon (high priority within window).
 const soon = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
 const t2 = tk.taskStore.create({ title: 'Send quote', assignee: 'agent-2', priority: 'urgent', dueAt: soon });
 assert(tk.reminders.dueSoon().find((x) => x.id === t2.id), 'upcoming task within window is due-soon');

 // Validation.
 let threw = false; try { tk.taskStore.create({ title: 'bad', priority: 'whenever' }); } catch (_e) { threw = true; }
 assert(threw, 'invalid priority rejected');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all tasks checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
