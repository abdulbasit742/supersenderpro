'use strict';

const { config } = require('./config');

// Build a throttled, quiet-hours-aware send plan. PURE function: returns the
// schedule, never sends anything. The host app's send adapter executes it.

function inQuietHours(hour) {
  const s = config.quietStartHour;
  const e = config.quietEndHour;
  if (s === e) return false;
  if (s < e) return hour >= s && hour < e;
  // window wraps midnight (e.g. 22 -> 8)
  return hour >= s || hour < e;
}

function nextActiveTime(date) {
  const d = new Date(date);
  while (inQuietHours(d.getHours())) {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  }
  return d;
}

// recipients: array of contacts. Returns batches with estimated dispatch times.
function build(recipients, opts) {
  opts = opts || {};
  const list = Array.isArray(recipients) ? recipients : [];
  const rate = Math.max(1, Number(opts.ratePerMinute) || config.ratePerMinute);
  const batchSize = Math.max(1, Number(opts.batchSize) || config.batchSize);
  const start = nextActiveTime(opts.startAt ? new Date(opts.startAt) : new Date());

  const batches = [];
  let cursor = new Date(start);
  for (let i = 0; i < list.length; i += batchSize) {
    const slice = list.slice(i, i + batchSize);
    cursor = nextActiveTime(cursor);
    batches.push({
      index: batches.length,
      dispatchAt: cursor.toISOString(),
      count: slice.length,
      recipientIds: slice.map((c) => c.id || c.phone || c.wa || null),
    });
    // advance the cursor by how long this batch takes at the configured rate
    const minutes = Math.ceil(slice.length / rate);
    cursor = new Date(cursor.getTime() + minutes * 60 * 1000);
  }

  const totalMinutes = list.length ? Math.ceil(list.length / rate) : 0;
  return {
    recipients: list.length,
    batchSize,
    ratePerMinute: rate,
    batches,
    startAt: start.toISOString(),
    estimatedFinishAt: new Date(start.getTime() + totalMinutes * 60 * 1000).toISOString(),
    estimatedMinutes: totalMinutes,
  };
}

module.exports = { build, inQuietHours, nextActiveTime };
