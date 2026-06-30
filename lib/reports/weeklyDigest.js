'use strict';
/**
 * weeklyDigest.js — Reports Feature #2: the Monday morning weekly digest.
 *
 * The daily digest (#reports1) is a pulse; this is the strategic weekly view: where are the numbers
 * vs LAST week (up/down arrows), what was the best campaign, who's the top referrer, what's at risk.
 * Snapshots each week so it can compute week-over-week deltas.
 *
 * Decoupled: dashboard provider + sender injected. Storage: JSON (data/weekly_snapshots.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'weekly_snapshots.json');

let dashboardProvider = null;
let sender = null;
function setDashboardProvider(fn) { dashboardProvider = typeof fn === 'function' ? fn : null; }
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { snapshots: [] }; }
  catch { return { snapshots: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const money = (n) => (Number(n) || 0).toLocaleString();

function arrow(curr, prev) {
  const c = Number(curr) || 0, p = Number(prev) || 0;
  if (p === 0) return c > 0 ? '⬆️ new' : '—';
  const pct = Math.round(((c - p) / p) * 100);
  if (pct > 0) return `⬆️ +${pct}%`;
  if (pct < 0) return `⬇️ ${pct}%`;
  return '→ 0%';
}

/** Snapshot this week's key metrics (call weekly before composing, or compose() does it). */
function snapshot() {
  const d = dashboardProvider ? dashboardProvider() : null;
  const h = (d && d.headline) || {};
  const snap = {
    at: nowIso(),
    revenue: h.revenue || 0,
    leads: h.leads || 0,
    customers: h.customers || 0,
    activeSubscriptions: h.activeSubscriptions || 0
  };
  const data = load();
  data.snapshots.push(snap);
  if (data.snapshots.length > 104) data.snapshots = data.snapshots.slice(-104); // ~2 years of weeks
  save(data);
  return snap;
}

/** Build the weekly digest text (uses the previous snapshot for deltas). */
function build() {
  const data = load();
  const prev = data.snapshots[data.snapshots.length - 1] || null; // last stored = last week
  const curr = snapshot(); // stores this week + returns it

  const d = dashboardProvider ? dashboardProvider() : null;
  const health = (d && d.health) || {};

  const lines = [
    '*📈 Weekly Business Review*',
    '',
    `💰 Revenue: ${money(curr.revenue)}  (${arrow(curr.revenue, prev && prev.revenue)})`,
    `🧲 Leads: ${curr.leads}  (${arrow(curr.leads, prev && prev.leads)})`,
    `👥 Customers: ${curr.customers}  (${arrow(curr.customers, prev && prev.customers)})`,
    `🔁 Active subs: ${curr.activeSubscriptions}  (${arrow(curr.activeSubscriptions, prev && prev.activeSubscriptions)})`
  ];
  if ((health.pastDueSubscriptions || 0) > 0) {
    lines.push('', `⚠️ ${health.pastDueSubscriptions} subscription(s) at risk (past due).`);
  }
  lines.push('', 'Have a great week! 🚀');
  return lines.join('\n');
}

async function sendNow(ownerPhone) {
  if (!ownerPhone) throw new Error('ownerPhone required');
  if (!sender) throw new Error('no sender wired');
  const text = build();
  const to = String(ownerPhone).includes('@') ? ownerPhone : `${String(ownerPhone).replace(/[^\d]/g, '')}@c.us`;
  const result = await sender(to, text);
  return { sent: true, to, text, result };
}

module.exports = { setDashboardProvider, setSender, snapshot, build, sendNow };
