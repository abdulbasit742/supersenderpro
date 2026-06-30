// lib/contentAutopilot/analytics.js
// Analytics for the Content Autopilot, derived entirely from the queue
// folders (posted/ and failed/). No DB, no new dependency.
//
// Honesty: these are operational metrics (what the autopilot attempted and
// the API responses it got back). They are NOT platform-side engagement
// metrics (likes/views) — fetching those needs each platform's insights API
// and is intentionally out of scope here.

const orchestrator = require('./index');

function summarize() {
  const posted = orchestrator.listJobs('posted');
  const failed = orchestrator.listJobs('failed');
  const queued = orchestrator.listJobs('queued');

  const byPlatform = {};
  const bump = (platform, key) => {
    byPlatform[platform] = byPlatform[platform] || { posted: 0, failed: 0, queued: 0 };
    byPlatform[platform][key] += 1;
  };
  posted.forEach((j) => bump(j.platform, 'posted'));
  failed.forEach((j) => bump(j.platform, 'failed'));
  queued.forEach((j) => bump(j.platform, 'queued'));

  const totalPosted = posted.length;
  const totalFailed = failed.length;
  const attempts = totalPosted + totalFailed;
  const successRate = attempts ? Math.round((totalPosted / attempts) * 100) : null;

  // why-failed breakdown (reason/error string -> count)
  const failReasons = {};
  failed.forEach((j) => {
    const r = (j.result && (j.result.reason || (j.result.error && (j.result.error.message || j.result.error)) || 'unknown')) || 'unknown';
    const key = String(r).slice(0, 80);
    failReasons[key] = (failReasons[key] || 0) + 1;
  });

  return {
    totals: { posted: totalPosted, failed: totalFailed, queued: queued.length, attempts, successRate },
    byPlatform,
    failReasons,
  };
}

function recent(limit) {
  const n = Number(limit) > 0 ? Number(limit) : 20;
  const all = []
    .concat(orchestrator.listJobs('posted').map((j) => ({ ...j, _bucket: 'posted' })))
    .concat(orchestrator.listJobs('failed').map((j) => ({ ...j, _bucket: 'failed' })));
  all.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return all.slice(0, n).map((j) => ({
    id: j.id,
    platform: j.platform,
    topic: j.topic,
    bucket: j._bucket,
    updatedAt: j.updatedAt,
    ok: !!(j.result && j.result.ok),
    note: j.result && (j.result.reason || (j.result.error && (j.result.error.message || j.result.error)) || (j.result.ok ? 'posted' : '')),
  }));
}

module.exports = { summarize, recent };
