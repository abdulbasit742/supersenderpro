// lib/engagement/engine.js
// Messaging engagement / responsiveness math. Walks each customer's chronological
// interaction timeline and pairs each OUTBOUND message with the next INBOUND
// reply to measure (a) reply rate and (b) reply latency. Also measures how often
// an outbound is followed by an order within a window (message->order conversion).
//
// Distinct from siblings:
//   - Send-time = which hour/day customers are active (timing).
//   - Conversion funnel (analytics) = customer-level Contacts->Ordered.
//   - This = per-MESSAGE effectiveness: do sends earn replies, how fast, do they
//     lead to orders.

const HOUR = 3600000;
const DAY = 24 * HOUR;

function round(n, dp = 2) { const f = Math.pow(10, dp); return Math.round((Number(n) || 0) * f) / f; }
function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const OUT_TYPES = new Set(['message_out', 'broadcast', 'follow_up', 're_engagement', 'outbound']);
const IN_TYPES = new Set(['inbound', 'reply', 'message_in']);

// timelines: Array<Array<{ts, type}>> — one chronological array per customer.
function analyze(timelines, opts = {}) {
  const replyWindow = (opts.replyWindowHours || 48) * HOUR;
  const orderWindow = (opts.orderWindowDays || 7) * DAY;

  let outbound = 0;
  let replied = 0;
  let outboundToOrder = 0;
  const latencies = []; // ms from outbound -> first inbound reply

  for (const raw of timelines) {
    const tl = (raw || []).filter((e) => e && e.ts).map((e) => ({ t: new Date(e.ts).getTime(), type: e.type }))
      .sort((a, b) => a.t - b.t);
    for (let i = 0; i < tl.length; i++) {
      if (!OUT_TYPES.has(tl[i].type)) continue;
      outbound += 1;
      // find next inbound within the reply window
      let gotReply = false;
      let gotOrder = false;
      for (let j = i + 1; j < tl.length; j++) {
        const dt = tl[j].t - tl[i].t;
        if (dt > orderWindow) break;
        if (!gotReply && IN_TYPES.has(tl[j].type) && dt <= replyWindow) {
          replied += 1; latencies.push(dt); gotReply = true;
        }
        if (!gotOrder && tl[j].type === 'order' && dt <= orderWindow) {
          outboundToOrder += 1; gotOrder = true;
        }
        if (gotReply && gotOrder) break;
      }
    }
  }

  // Latency histogram buckets.
  const buckets = [
    { label: '< 1h', min: 0, max: HOUR, count: 0 },
    { label: '1\u20134h', min: HOUR, max: 4 * HOUR, count: 0 },
    { label: '4\u201312h', min: 4 * HOUR, max: 12 * HOUR, count: 0 },
    { label: '12\u201324h', min: 12 * HOUR, max: DAY, count: 0 },
    { label: '1\u20132d', min: DAY, max: 2 * DAY, count: 0 },
  ];
  for (const l of latencies) {
    const b = buckets.find((x) => l >= x.min && l < x.max);
    if (b) b.count += 1;
  }

  const medianLatencyH = latencies.length ? round(median(latencies) / HOUR, 1) : null;
  const avgLatencyH = latencies.length ? round((latencies.reduce((s, x) => s + x, 0) / latencies.length) / HOUR, 1) : null;

  return {
    summary: {
      outboundMessages: outbound,
      replies: replied,
      replyRatePct: outbound ? round((replied / outbound) * 100) : 0,
      messageToOrderPct: outbound ? round((outboundToOrder / outbound) * 100) : 0,
      medianReplyLatencyHours: medianLatencyH,
      avgReplyLatencyHours: avgLatencyH,
    },
    latencyHistogram: buckets.map((b) => ({ label: b.label, count: b.count })),
  };
}

module.exports = { analyze, median, round };
