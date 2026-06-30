#!/usr/bin/env node
// scripts/analytics-check.js — Offline safety + behavior check. Run: npm run analytics:check

const an = require('../lib/analytics');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(an && an.eventTracker, 'module loads');
 assert(an.config.effective.liveDigests === false, 'digests are draft-only by default (safe)');

 const ev = an.track({ event: 'message_sent', value: 1, dimensions: { channel: 'whatsapp' } });
 assert(ev.event === 'message_sent', 'track records an event');

 // PII must be redacted at ingest.
 const pii = an.track({ event: 'lead_captured', dimensions: { contact: '+923001234567', email: 'a@b.com' } });
 assert(pii.dims.contact === 'redacted' && pii.dims.email === 'redacted', 'phone/email dimensions are redacted (no PII stored)');

 an.track({ event: 'checkout_view' }); an.track({ event: 'checkout_view' });
 an.track({ event: 'purchase' });
 const f = an.funnel.analyze(an.eventTracker.all(), { steps: ['checkout_view', 'purchase'] });
 assert(f.steps.length === 2 && f.overallConversionPct > 0, 'funnel computes conversion across steps');

 const ts = an.rollups.timeSeries(an.eventTracker.all(), { event: 'message_sent', period: 'day' });
 assert(Array.isArray(ts) && ts.length >= 1, 'time series buckets events by day');

 const csv = an.csvExport.eventsCSV(an.eventTracker.all());
 assert(csv.split('\n')[0] === 'id,event,value,at,dims', 'CSV export has a header row');

 const dig = await an.digestBuilder.run({ period: 'daily' });
 assert(dig.sent === false && dig.draft === true, 'digest is drafted, not sent (safe default)');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all analytics checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
