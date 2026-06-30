'use strict';
/**
 * lib/adminAlert/index.js - Core Stability admin alerting.
 * Backlog cluster: TASK-0041..0060 (admin alert for Core Stability).
 *
 * Pairs with lib/healthCheck (PR #53): evaluates a health report, raises alerts on
 * degraded/down, dedupes via cooldown, and dispatches to the owner.
 *
 * Safe by default: ADMIN_ALERT_DRY_RUN=true prepares alerts without sending.
 * Dispatch uses the project's global.sendWhatsApp when available, else logs (never throws).
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const STATE_FILE = path.join(DATA_DIR, 'admin_alerts.json');

const bool = (v, def = false) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));

const config = {
  dryRun: bool(process.env.ADMIN_ALERT_DRY_RUN, true),
  enabled: bool(process.env.ADMIN_ALERT_ENABLED, true),
  cooldownMin: Number(process.env.ADMIN_ALERT_COOLDOWN_MIN || 15),
  // Comma-separated WhatsApp numbers for the owner/admins.
  recipients: String(process.env.ADMIN_ALERT_RECIPIENTS || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Alert on this severity or worse: 'degraded' | 'down'.
  minSeverity: (process.env.ADMIN_ALERT_MIN_SEVERITY || 'down').toLowerCase(),
};

const SEV_RANK = { ok: 0, degraded: 1, down: 2 };
const nowISO = () => new Date().toISOString();

function readState() {
  try { if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
  return { lastAlertAt: {}, history: [] };
}
function writeState(s) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch {}
  return s;
}

// Build human-readable alert text from a health report.
function formatAlert(report) {
  const bad = Object.entries(report.checks || {})
    .filter(([, c]) => c && (c.status === 'down' || c.status === 'degraded'))
    .map(([name, c]) => '- ' + name + ': ' + c.status + (c.error ? ' (' + c.error + ')' : ''));
  return [
    'SuperSender ALERT [' + String(report.status).toUpperCase() + ']',
    'host: ' + (report.host || '?') + '  uptime: ' + (report.uptimeSec || 0) + 's',
    'time: ' + (report.timestamp || nowISO()),
    bad.length ? '\nFailing checks:\n' + bad.join('\n') : '',
  ].join('\n').trim();
}

async function dispatch(message) {
  const results = [];
  if (config.dryRun || !config.recipients.length || typeof global.sendWhatsApp !== 'function') {
    console.warn('[AdminAlert] ' + (config.dryRun ? 'dry-run' : 'no sender/recipients') + ' - alert prepared, not sent:\n' + message);
    return { sent: false, prepared: true, recipients: config.recipients.length };
  }
  for (const to of config.recipients) {
    try { await global.sendWhatsApp(to, message, { source: 'admin_alert' }); results.push({ to, ok: true }); }
    catch (e) { results.push({ to, ok: false, error: e.message }); }
  }
  return { sent: results.some((r) => r.ok), prepared: false, results };
}

// Decide + (maybe) fire an alert for a given health report.
async function evaluate(report) {
  if (!config.enabled) return { alerted: false, reason: 'disabled' };
  const rank = SEV_RANK[report.status] || 0;
  const minRank = SEV_RANK[config.minSeverity] != null ? SEV_RANK[config.minSeverity] : 2;
  if (rank < minRank) return { alerted: false, reason: 'below threshold (' + report.status + ')' };

  const state = readState();
  const key = report.status;
  const last = state.lastAlertAt[key] ? new Date(state.lastAlertAt[key]).getTime() : 0;
  if (Date.now() - last < config.cooldownMin * 60000) {
    return { alerted: false, reason: 'cooldown active for ' + key };
  }

  const message = formatAlert(report);
  const dispatchResult = await dispatch(message);
  state.lastAlertAt[key] = nowISO();
  state.history.unshift({ at: nowISO(), status: report.status, message, dispatch: dispatchResult });
  if (state.history.length > 500) state.history = state.history.slice(0, 500);
  writeState(state);
  return { alerted: true, status: report.status, dispatch: dispatchResult };
}

function getStatus() {
  const state = readState();
  return { config: Object.assign({}, config, { recipients: config.recipients.length }), lastAlertAt: state.lastAlertAt, historyCount: state.history.length };
}
function getHistory(limit = 50) { return readState().history.slice(0, limit); }

// Poll the health check every N seconds and auto-evaluate. Returns the interval handle.
function startPolling(intervalSec) {
  let H = null;
  try { H = require('../healthCheck'); } catch { console.warn('[AdminAlert] healthCheck not found - polling disabled'); return null; }
  const ms = Math.max(15, Number(intervalSec || process.env.ADMIN_ALERT_POLL_SEC || 60)) * 1000;
  const handle = setInterval(async () => {
    try { const r = await H.getHealth({ force: true }); await evaluate(r); }
    catch (e) { console.error('[AdminAlert] poll error:', e.message); }
  }, ms);
  if (handle.unref) handle.unref();
  console.log('[AdminAlert] polling health every ' + (ms / 1000) + 's');
  return handle;
}

module.exports = { config, evaluate, formatAlert, getStatus, getHistory, startPolling };
