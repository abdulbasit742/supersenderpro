#!/usr/bin/env node
// scripts/owner-briefing-cron.js
// 9am Daily Owner Briefing. Runs on PC #1 (the always-on inference box) while
// the model is warm. Generates the briefing and, if a delivery webhook is
// configured, posts it (e.g. to the founder's WhatsApp via the app's own
// send endpoint). Pure read-over-data + one generation; safe to run daily.
//
// Usage:
//   node scripts/owner-briefing-cron.js                 # default_store
//   node scripts/owner-briefing-cron.js --store mystore
//
// Optional delivery: set BRIEFING_WEBHOOK_URL to an endpoint that accepts
//   { storeId, text } and sends it to the founder (e.g. a thin wrapper around
//   the existing WhatsApp send). If unset, the briefing is just saved + logged.
//
// Cron (PC #1), daily 9am:
//   0 9 * * *  cd /path/to/supersenderpro && node scripts/owner-briefing-cron.js >> data/owner_briefing/cron.log 2>&1

const briefing = require('../lib/ownerBriefing/dailyBriefing');

function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(async () => {
  const storeId = val('--store', 'default_store');
  console.log(`[owner-briefing] generating for store=${storeId} at ${new Date().toISOString()}`);
  const rec = await briefing.generate({ storeId });

  console.log('\n' + rec.text + '\n');

  const hook = process.env.BRIEFING_WEBHOOK_URL;
  if (hook) {
    try {
      const res = await fetch(hook, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, text: rec.text })
      });
      console.log(`[owner-briefing] delivery -> ${hook}: HTTP ${res.status}`);
    } catch (e) { console.error('[owner-briefing] delivery failed:', e.message); }
  } else {
    console.log('[owner-briefing] BRIEFING_WEBHOOK_URL not set; briefing saved only.');
  }
  process.exit(0);
})().catch((e) => { console.error('[owner-briefing] failed:', e); process.exit(1); });
