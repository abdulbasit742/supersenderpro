#!/usr/bin/env node
// tests/smoke/dripCampaignsSmoke.js — Smoke test for merge render + scheduling. Run: npm run drip-campaigns:smoke

const dc = require('../../lib/dripCampaigns');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!dc.enrollmentEngine, 'engine present');

 const r = dc.mergeRender.render('Hi {{name}}, your order {{order}} shipped', { name: 'Sana', order: 'A-12' });
 t(r === 'Hi Sana, your order A-12 shipped', 'merge fields render');
 t(dc.mergeRender.render('Hi {{unknown}}!') === 'Hi !', 'unknown merge field renders empty (no token leak)');

 const j = dc.journeyStore.upsert({ id: 'jny-smoke-cart', name: 'Abandoned cart', trigger: 'abandoned_cart', steps: [
 { waitMinutes: 60, message: '{{name}}, you left items in your cart.' },
 ] });
 t(j.trigger === 'abandoned_cart', 'journey trigger persisted');

 const e = dc.enrollmentEngine.enrollManual('jny-smoke-cart', { contact: '+923001112223', name: 'Omar' });
 t(e.enrollment && e.enrollment.nextStepDueAt, 'manual enroll schedules first step in the future');
 t(e.enrollment.contactMasked.indexOf('1112223') === -1, 'contact masked in enrollment view');

 // First step is 60 min out, so an immediate tick should NOT fire it.
 const now = await dc.enrollmentEngine.tick(Date.now());
 const firedThis = now.results.find((x) => x.journeyId === 'jny-smoke-cart');
 t(!firedThis, 'step not fired before its wait delay');

 const ov = dc.enrollmentEngine.overview();
 t(typeof ov.cards.activeEnrollments === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
