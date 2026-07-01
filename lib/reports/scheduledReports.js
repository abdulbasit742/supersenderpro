'use strict';
/**
 * scheduledReports.js — Reports Feature #1: automatic KPI digests to the owner.
 *
 * The owner dashboard (#analytics1) is great, but a founder won't log in daily. This pushes the
 * numbers TO them: a concise daily/weekly digest delivered on WhatsApp. It composes the digest from
 * the same dashboard aggregator and sends via the guarded sender (#sending1) so it's rate-safe.
 *
 * Decoupled: dashboard provider + sender are injected. A tick() (cron) fires due reports.
 * Storage: JSON (data/scheduled_reports.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'scheduled_reports.json');

let dashboardProvider = null; // () => dashboard object (ownerDashboard.getDashboard)
let sender = null;            // async (phone, text) => any (guarded)
function setDashboardProvider(fn) { dashboardProvider = typeof fn === 'function' ? fn : null; }
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { reports: [] }; }
  catch { return { reports: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();
const DAY = 86400000;

/** Build a WhatsApp-friendly digest string from a dashboard object. */
function formatDigest(dash, label = 'Daily') {
  if (!dash) return `${label} report: no data yet.`;
  const h = dash.headline || {};
  const f = dash.funnel || {};
  const e = dash.engagement || {};
  const hl = dash.health || {};
  const money = (n) => (n == null ? '0' : Number(n).toLocaleString());
  return [
    `📊 *${label} Report — SuperSender*`,
    ``,
    `💰 Revenue: ${money(h.revenue)}`,
    `👥 Leads: ${h.leads || 0}  •  Customers: ${h.customers || 0}  (${f.leadToCustomerPct || 0}% conv)`,
    `📨 Sent: ${e.sent || 0}  •  Open: ${e.openRatePct || 0}%  •  Clicks: ${e.clickRatePct || 0}%`,
    `📈 Active subs: ${hl.activeSubscriptions || 0}  •  Forecast: ${money(h.weightedForecast)}`,
    hl.pastDueSubscriptions ? `⚠️ Past-due (churn risk): ${hl.pastDueSubscriptions}` : `✅ No churn risk flagged`
  ].join('\n');
}

/**
 * Schedule a recurring report.
 * @param {Object} opts { ownerPhone, frequency:'daily'|'weekly', hourLocal?, label? }
 */
function scheduleReport(opts = {}) {
  if (!opts.ownerPhone) throw new Error('ownerPhone required');
  const frequency = opts.frequency === 'weekly' ? 'weekly' : 'daily';
  const data = load();
  const report = {
    id: `RPT-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    ownerPhone: String(opts.ownerPhone).replace(/[^\d]/g, ''),
    frequency,
    label: opts.label || (frequency === 'weekly' ? 'Weekly' : 'Daily'),
    intervalMs: frequency === 'weekly' ? 7 * DAY : DAY,
    nextRunAt: nowMs() + 60000, // first one shortly after scheduling; cron adjusts cadence
    active: true,
    createdAt: iso(nowMs()),
    history: []
  };
  data.reports.push(report);
  save(data);
  return report;
}

function listReports() { return load().reports; }
function setActive(id, active) {
  const data = load();
  const r = data.reports.find(x => x.id === id);
  if (!r) return null;
  r.active = !!active;
  save(data);
  return r;
}

/** Send one report now (also used by tick). Returns the digest text + send result. */
async function sendNow(id) {
  const data = load();
  const r = data.reports.find(x => x.id === id);
  if (!r) return null;
  const dash = dashboardProvider ? dashboardProvider() : null;
  const text = formatDigest(dash, r.label);
  let result = null;
  if (sender) { try { result = await sender(r.ownerPhone, text); } catch (e) { result = { error: e.message }; } }
  r.history.unshift({ at: iso(nowMs()), sent: !!sender });
  if (r.history.length > 30) r.history = r.history.slice(0, 30);
  save(data);
  return { text, result };
}

/** Fire due reports. Call on a cron (e.g. hourly). */
async function tick() {
  const data = load();
  const t = nowMs();
  let fired = 0;
  for (const r of data.reports) {
    if (!r.active || t < r.nextRunAt) continue;
    const dash = dashboardProvider ? dashboardProvider() : null;
    const text = formatDigest(dash, r.label);
    if (sender) { try { await sender(r.ownerPhone, text); } catch { /* ignore */ } }
    r.history.unshift({ at: iso(t), sent: !!sender });
    if (r.history.length > 30) r.history = r.history.slice(0, 30);
    let next = r.nextRunAt + r.intervalMs;
    while (next <= t) next += r.intervalMs;
    r.nextRunAt = next;
    fired++;
  }
  save(data);
  return { fired, at: iso(t) };
}

module.exports = { setDashboardProvider, setSender, formatDigest, scheduleReport, listReports, setActive, sendNow, tick };
