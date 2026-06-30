#!/usr/bin/env node
// tests/smoke/messageSchedulerSmoke.js — Smoke test for cron + timezone + pause/resume. Run: npm run message-scheduler:smoke

const ms = require('../../lib/messageScheduler');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!ms.jobEngine, 'engine present');

 // cron with list + range + step
 t(ms.cron.isValid('0,30 9-17 * * 1-5'), 'business-hours cron is valid');
 const next = ms.cron.nextRun('0,30 9-17 * * 1-5', Date.parse('2026-06-30T05:00:00Z'), 'UTC');
 t(typeof next === 'string', 'cron computes a next run for business-hours expression');

 // timezone helper returns an hour 0-23
 const h = ms.timezone.localHour(new Date(), 'Asia/Karachi');
 t(h >= 0 && h <= 23, 'timezone localHour returns a valid hour');

 // pause/resume/cancel lifecycle
 const j = ms.jobEngine.schedule({ name: 'PR', type: 'recurring', contact: '+923009998877', message: 'hi', cron: '0 10 * * *', timezone: 'Asia/Karachi' });
 t(ms.jobEngine.pause(j.id).status === 'paused', 'job pauses');
 t(ms.jobEngine.resume(j.id).status === 'scheduled', 'job resumes');
 t(ms.jobEngine.cancel(j.id).status === 'cancelled', 'job cancels');

 // paused/cancelled jobs do not fire
 const past = new Date(Date.now() - 60000).toISOString();
 const j2 = ms.jobEngine.schedule({ name: 'NoFire', type: 'one_off', contact: '+923001112223', message: 'x', runAt: past, timezone: 'UTC' });
 ms.jobEngine.pause(j2.id);
 const tick = await ms.jobEngine.tick(Date.now());
 t(!tick.results.find((r) => r.jobId === j2.id), 'paused job does not fire on tick');

 const ov = ms.jobEngine.overview();
 t(typeof ov.cards.scheduled === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
