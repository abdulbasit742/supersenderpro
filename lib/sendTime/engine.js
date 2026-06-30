// lib/sendTime/engine.js
// Best-time-to-send math. Bins inbound customer interactions into a
// 7 (day-of-week) x 24 (hour) grid to find when customers are actually awake
// and responsive, then ranks the strongest windows.
//
// Why it's not the forecast module: forecast's day-of-week index predicts how
// much REVENUE a future day will bring. This is about intraday RESPONSIVENESS
// (which hour to hit send), a completely different question and grain.
//
// Timezone matters: WhatsApp customers are local, so timestamps are bucketed in
// a configurable IANA zone (default Asia/Karachi), not UTC.

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function round(n, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round((Number(n) || 0) * f) / f;
}

// Get {dow, hour} for a timestamp in a given IANA timezone, without pulling in
// a date library: Intl gives us the local parts reliably.
function localParts(ts, timeZone) {
  const d = new Date(ts);
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone, weekday: 'short', hour: 'numeric', hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const wd = parts.find((p) => p.type === 'weekday');
    let hourStr = (parts.find((p) => p.type === 'hour') || {}).value || '0';
    let hour = parseInt(hourStr, 10) % 24;
    const dow = Math.max(0, DOW.indexOf(wd ? wd.value : 'Sun'));
    return { dow, hour };
  } catch {
    return { dow: d.getUTCDay(), hour: d.getUTCHours() };
  }
}

// interactions: [{ ts, type }]. We count "engagement" events: inbound messages,
// replies, and orders — i.e. moments a customer chose to act.
const ENGAGE_TYPES = new Set(['inbound', 'reply', 'message_in', 'order', 'loyalty_redeem']);

function analyze(interactions, opts = {}) {
  const timeZone = opts.timeZone || process.env.SENDTIME_TZ || 'Asia/Karachi';
  // grid[dow][hour] = count
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let total = 0;

  for (const i of interactions) {
    if (!i || !i.ts) continue;
    if (!ENGAGE_TYPES.has(i.type)) continue;
    const { dow, hour } = localParts(i.ts, timeZone);
    grid[dow][hour] += 1;
    total += 1;
  }

  // Flatten to ranked windows.
  const windows = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d][h] > 0) {
        windows.push({ dow: d, day: DOW[d], hour: h, count: grid[d][h], sharePct: total ? round((grid[d][h] / total) * 100) : 0 });
      }
    }
  }
  windows.sort((a, b) => b.count - a.count);

  // Best hours overall (collapsed across days) + best days.
  const byHour = new Array(24).fill(0);
  const byDay = new Array(7).fill(0);
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) { byHour[h] += grid[d][h]; byDay[d] += grid[d][h]; }
  const peakHour = byHour.indexOf(Math.max(...byHour));
  const peakDay = byDay.indexOf(Math.max(...byDay));

  return {
    timeZone,
    totalEvents: total,
    grid,
    topWindows: windows.slice(0, 5),
    peakHour: total ? peakHour : null,
    peakDay: total ? DOW[peakDay] : null,
    byHour,
    byDay: byDay.map((c, i) => ({ day: DOW[i], count: c })),
  };
}

// Turn an hour int into a friendly label, e.g. 14 -> "2 PM".
function hourLabel(h) {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
}

module.exports = { analyze, hourLabel, DOW, round };
