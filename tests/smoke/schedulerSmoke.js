// tests/smoke/schedulerSmoke.js
// Offline smoke test for the recurring scheduler. No model: auto-generate uses
// template. Focus: next-run math for daily/weekly/monthly/once, due detection,
// advance, pause/resume, maxRuns completion. Exit code 0 = pass.
//
// Run: node tests/smoke/schedulerSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template copy
process.env.SCHEDULER_TZ = 'Asia/Karachi';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sch = require('../../lib/scheduler/recurringScheduler');
const { nextRun, localParts, normalizeDays } = sch._internal;

function clear(storeId) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'scheduler', `${storeId}_schedules.json`)); } catch {} }

(async () => {
  let passed = 0;
  const STORE = 'sched_smoke';
  const TZ = 'Asia/Karachi';
  clear(STORE);

  // normalizeDays accepts names + numbers
  assert.deepStrictEqual(normalizeDays(['mon', 'fri', 3]).sort(), [1, 3, 5]); passed++;

  // daily: next run is in the future, at the configured local hour
  const daily = { freq: 'daily', time: '10:00', timezone: TZ };
  const dn = nextRun(daily, Date.now());
  assert.ok(dn > Date.now()); passed++;
  assert.strictEqual(localParts(dn, TZ).hour, 10); assert.strictEqual(localParts(dn, TZ).minute, 0); passed++;

  // weekly: next run lands on one of the requested weekdays
  const weekly = { freq: 'weekly', time: '18:00', days: [5], timezone: TZ }; // Friday
  const wn = nextRun(weekly, Date.now());
  assert.ok(wn > Date.now()); assert.strictEqual(localParts(wn, TZ).weekday, 5); passed++;
  assert.strictEqual(localParts(wn, TZ).hour, 18); passed++;

  // monthly: next run lands on the requested day-of-month
  const monthly = { freq: 'monthly', time: '09:00', dayOfMonth: 1, timezone: TZ };
  const mn = nextRun(monthly, Date.now());
  assert.ok(mn > Date.now()); assert.strictEqual(localParts(mn, TZ).day, 1); passed++;

  // once: returns the configured time if future, else null
  const future = new Date(Date.now() + 86400000).toISOString();
  assert.ok(nextRun({ freq: 'once', onceAtISO: future }) > Date.now()); passed++;
  assert.strictEqual(nextRun({ freq: 'once', onceAtISO: new Date(Date.now() - 86400000).toISOString() }), null); passed++;

  // create persists + computes nextRunISO
  const c = sch.create({ storeId: STORE, id: 'fri-promo', freq: 'weekly', time: '18:00', days: ['fri'], message: 'Hi {{name}}, weekend deals!' });
  assert.ok(c.nextRunISO && new Date(c.nextRunISO).getTime() > Date.now()); passed++;
  assert.deepStrictEqual(c.days, [5]); passed++;

  // create requires message or autoGenerateGoal
  let threw = false; try { sch.create({ storeId: STORE, id: 'x', freq: 'daily', time: '10:00' }); } catch { threw = true; }
  assert.ok(threw, 'create without message/goal should throw'); passed++;

  // force-due: backdate nextRunISO and check due()
  const file = path.join(__dirname, '..', '..', 'data', 'scheduler', `${STORE}_schedules.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data['fri-promo'].nextRunISO = new Date(Date.now() - 60000).toISOString();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  const dueList = sch.due({ storeId: STORE });
  assert.ok(dueList.find(d => d.id === 'fri-promo')); passed++;

  // markRan advances to a future next run, increments runCount
  const ran = await sch.markRan({ storeId: STORE, id: 'fri-promo' });
  assert.strictEqual(ran.runCount, 1); assert.ok(new Date(ran.nextRunISO).getTime() > Date.now()); passed++;
  assert.ok(ran.message && ran.message.includes('{{name}}')); passed++;

  // maxRuns completion: a once schedule completes after a run
  sch.create({ storeId: STORE, id: 'oneshot', freq: 'once', onceAtISO: new Date(Date.now() + 3600000).toISOString(), message: 'hello {{name}}' });
  const ranOnce = await sch.markRan({ storeId: STORE, id: 'oneshot' });
  assert.strictEqual(ranOnce.status, 'completed'); assert.strictEqual(ranOnce.nextRunISO, null); passed++;

  // pause stops it from being due; resume recomputes
  sch.pause({ storeId: STORE, id: 'fri-promo' });
  assert.strictEqual(sch.getSchedule({ storeId: STORE, id: 'fri-promo' }).status, 'paused'); passed++;
  const res = sch.resume({ storeId: STORE, id: 'fri-promo' });
  assert.strictEqual(res.status, 'active'); assert.ok(res.nextRunISO); passed++;

  // preview lists multiple upcoming runs (weekly -> spaced ~7 days)
  const pv = sch.preview({ storeId: STORE, id: 'fri-promo', count: 3 });
  assert.ok(pv.runs.length >= 2); passed++;
  const gapDays = (new Date(pv.runs[1]) - new Date(pv.runs[0])) / 86400000;
  assert.ok(gapDays >= 6 && gapDays <= 8, `weekly gap ~7d, got ${gapDays}`); passed++;

  clear(STORE);
  console.log(`\u2705 scheduler smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c scheduler smoke failed:', e); process.exit(1); });
