#!/usr/bin/env node
// scripts/message-scheduler-check.js — Offline safety + behavior check. Run: npm run message-scheduler:check

const ms = require('../lib/messageScheduler');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(ms && ms.jobEngine, 'module loads');
 assert(ms.config.effective.liveSends === false, 'sends are draft-only by default (safe)');

 // cron parser
 assert(ms.cron.isValid('*/15 * * * *'), 'valid cron accepted');
 assert(!ms.cron.isValid('99 99 * *'), 'invalid cron rejected');
 const next = ms.cron.nextRun('0 9 * * *', Date.parse('2026-06-30T03:00:00Z'), 'UTC');
 assert(next === '2026-06-30T09:00:00.000Z', 'cron next-run computes 09:00 UTC same day');

 // one-off job in the past should fire on tick (drafted, not sent)
 const past = new Date(Date.now() - 60 * 1000).toISOString();
 const j = ms.jobEngine.schedule({ name: 'Test', type: 'one_off', contact: '+923001234567', message: 'Hello {{}}', runAt: past, timezone: 'UTC' });
 assert(j.id && j.status === 'scheduled', 'one-off job scheduled');
 const tick = await ms.jobEngine.tick(Date.now());
 const fired = tick.results.find((r) => r.jobId === j.id);
 assert(fired && fired.outcome === 'fired_one_off', 'due one-off job fires on tick');
 assert(fired.drafted >= 1 && fired.sent === 0, 'send is drafted, not sent (safe default)');
 const after = ms.jobEngine.get(j.id);
 assert(after.status === 'completed', 'one-off job completes after firing');

 // recurring job reschedules
 const rj = ms.jobEngine.schedule({ name: 'Daily', type: 'recurring', contact: '+923001234567', message: 'gm', cron: '*/1 * * * *', timezone: 'UTC' });
 assert(rj.nextRunAt, 'recurring job gets a nextRunAt');
 const t2 = await ms.jobEngine.tick(Date.parse(rj.nextRunAt) + 1000);
 const fired2 = t2.results.find((r) => r.jobId === rj.id);
 assert(fired2 && fired2.outcome === 'fired_recurring', 'recurring job fires and reschedules');
 const rjAfter = ms.jobEngine.get(rj.id);
 assert(rjAfter.status === 'scheduled' && rjAfter.runCount === 1, 'recurring job stays scheduled with runCount incremented');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all message-scheduler checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
