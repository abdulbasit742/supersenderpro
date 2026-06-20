// lib/voiceAI/scheduler.js — Schedules approved voice drafts for later (metadata only).
// Does NOT run a live sender. A real worker can poll due() and process with explicit consent.

const queue = require('./voiceQueue');

function schedule(id, whenIso) { return queue.schedule(id, whenIso); }

function due(nowIso = new Date().toISOString()) {
  return queue.all().filter((i) => i.status === 'approved' && i.scheduledAt && i.scheduledAt <= nowIso);
}

module.exports = { schedule, due };
