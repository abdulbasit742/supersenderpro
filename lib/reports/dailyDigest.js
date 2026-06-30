'use strict';
/**
 * dailyDigest.js — Reports Feature #1: the founder's daily WhatsApp digest.
 *
 * A busy, single-founder wants the numbers pushed to them, not to log in. This composes a short,
 * WhatsApp-friendly summary from the owner dashboard (analytics #1) and sends it to the owner's
 * number each morning (schedule it via the scheduler #2, or call sendNow()).
 *
 * Decoupled: the dashboard data and the sender are injected, so this rides the guarded sender
 * (anti-ban) and the existing dashboard aggregator without hard deps.
 */

let dashboardProvider = null; // () => dashboard object (from ownerDashboard.getDashboard)
let sender = null;            // async (phone, text) => any  (guarded sender)
function setDashboardProvider(fn) { dashboardProvider = typeof fn === 'function' ? fn : null; }
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }

function money(n) { return (Number(n) || 0).toLocaleString(); }

/**
 * Build the digest text from a dashboard object. Kept short — a founder reads it in 5 seconds.
 */
function compose(dashboard) {
  if (!dashboard) return 'No data yet. Connect WhatsApp and send your first campaign to see numbers here.';
  const h = dashboard.headline || {};
  const f = dashboard.funnel || {};
  const e = dashboard.engagement || {};
  const health = dashboard.health || {};

  const lines = [
    '*📊 SuperSender — Daily Brief*',
    '',
    `💰 Revenue: ${money(h.revenue)}`,
    `🧲 New leads: ${f.leads ?? 0}  |  Customers: ${f.customers ?? 0}  (${f.leadToCustomerPct ?? 0}% conv)`,
    `📣 Sends: ${e.sent ?? 0}  |  Open ${e.openRatePct ?? 0}%  |  Click ${e.clickRatePct ?? 0}%`,
    `🔁 Active subs: ${health.activeSubscriptions ?? 0}  |  Forecast: ${money((dashboard.revenue||{}).pipelineForecast)}`
  ];

  // The one thing to act on.
  let action = null;
  if ((health.pastDueSubscriptions || 0) > 0) action = `⚠️ ${health.pastDueSubscriptions} subscription(s) past due — dunning is on it, but check the big ones.`;
  else if ((f.leads || 0) > 0 && (f.customers || 0) === 0) action = '👉 You have leads but no customers yet — send a welcome/offer campaign.';
  else if ((e.sent || 0) === 0) action = '👉 No sends yet today — a quick broadcast keeps you top-of-mind.';
  if (action) { lines.push('', action); }

  return lines.join('\n');
}

/** Build today's digest text (without sending). */
function build() {
  const dashboard = dashboardProvider ? dashboardProvider() : null;
  return compose(dashboard);
}

/** Compose + send to the owner now. @param ownerPhone */
async function sendNow(ownerPhone) {
  if (!ownerPhone) throw new Error('ownerPhone required');
  if (!sender) throw new Error('no sender wired');
  const text = build();
  const to = String(ownerPhone).includes('@') ? ownerPhone : `${String(ownerPhone).replace(/[^\d]/g, '')}@c.us`;
  const result = await sender(to, text);
  return { sent: true, to, text, result };
}

module.exports = { setDashboardProvider, setSender, compose, build, sendNow };
