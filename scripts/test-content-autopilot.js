#!/usr/bin/env node
// scripts/test-content-autopilot.js
// One-command smoke test for the Content Autopilot.
// Run:  node scripts/test-content-autopilot.js
//
// What it checks (no server, no platform credentials required):
//   1. module loads
//   2. generate -> creates queued jobs (one per platform)
//   3. status -> counts reflect the new jobs
//   4. analytics -> summarize() runs and returns totals
//   5. publishDue -> runs; with no creds, jobs land in failed/ as 'skipped'
//      (this is the CORRECT honest behavior, not a bug)
//   6. cleanup -> removes the test jobs it created
//
// Exit code 0 = all assertions passed, 1 = something broke.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let pass = 0;
function ok(label) { console.log('  \u2713 ' + label); pass += 1; }

(async function run() {
  console.log('Content Autopilot smoke test\n');

  // 1. load
  const ap = require('../lib/contentAutopilot');
  assert(ap && typeof ap.generateContent === 'function', 'module should export generateContent');
  ok('module loads + exports generateContent');

  const TOPIC = '__SMOKE_TEST__ ' + Date.now();
  const PLATFORMS = ['facebook', 'linkedin'];

  // 2. generate
  const created = await ap.generateContent({ topic: TOPIC, platforms: PLATFORMS, tone: 'friendly' });
  assert(Array.isArray(created) && created.length === PLATFORMS.length, 'should create one job per platform');
  created.forEach((j) => { assert(j.id && j.content && j.status === 'queued', 'job should be well-formed + queued'); });
  ok('generate -> ' + created.length + ' queued jobs created');

  // 3. status
  const st = ap.status();
  assert(st && st.counts && st.counts.queued >= PLATFORMS.length, 'status.queued should include new jobs');
  ok('status -> queued count = ' + st.counts.queued);

  // 4. analytics
  let analytics = null;
  try { analytics = require('../lib/contentAutopilot/analytics'); } catch (e) { /* optional */ }
  if (analytics) {
    const sum = analytics.summarize();
    assert(sum && sum.totals, 'analytics.summarize should return totals');
    ok('analytics -> summarize() returns totals (posted=' + sum.totals.posted + ', failed=' + sum.totals.failed + ')');
  } else {
    console.log('  - analytics module not present (skipping)');
  }

  // 5. publishDue (no creds expected -> jobs should fail/skip, NOT crash)
  const ids = created.map((j) => j.id);
  const pub = await ap.publishDue();
  assert(pub && typeof pub.ran === 'number', 'publishDue should return a run summary');
  const failedDir = path.join(__dirname, '..', 'video-auto-posts', 'failed');
  const landedInFailed = ids.filter((id) => fs.existsSync(path.join(failedDir, id + '.json')));
  assert(landedInFailed.length === ids.length, 'with no credentials, test jobs should land in failed/ (skipped), not vanish');
  ok('publishDue -> ran ' + pub.ran + ' job(s); ' + landedInFailed.length + ' correctly skipped (no creds)');

  // 6. cleanup
  let cleaned = 0;
  ['queued', 'posted', 'failed'].forEach((bucket) => {
    const dir = path.join(__dirname, '..', 'video-auto-posts', bucket);
    ids.forEach((id) => {
      const p = path.join(dir, id + '.json');
      if (fs.existsSync(p)) { fs.unlinkSync(p); cleaned += 1; }
    });
  });
  ok('cleanup -> removed ' + cleaned + ' test job file(s)');

  console.log('\n\u2705 ' + pass + ' checks passed. Content Autopilot core is wired correctly.');
  console.log('Note: live platform posting still needs real tokens + a manual test (see lib/contentAutopilot/README.md).');
  process.exit(0);
})().catch((err) => {
  console.error('\n\u274c smoke test FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
