'use strict';
// Self-check for the Cart Recovery department. Read-only, safe to run anytime.
const { config } = require('./config');
const { load, FILE } = require('./store');

function check() {
  const issues = [];
  const info = [];
  if (!Array.isArray(config.nudgeStepsMinutes) || config.nudgeStepsMinutes.length === 0)
    issues.push('nudgeStepsMinutes is empty — no nudges will ever draft.');
  if (config.maxNudges < 1) issues.push('maxNudges < 1 — recovery disabled.');
  if (config.abandonAfterMinutes < 1) issues.push('abandonAfterMinutes < 1 — carts abandon instantly.');
  if (config.liveSend) info.push('LIVE send is ON — nudges will be queued to a notifier, not just drafted.');
  else info.push('DRY-RUN: nudges are drafted only, nothing sends.');

  let cartCount = 0, nudgeCount = 0;
  try { const db = load(); cartCount = Object.keys(db.carts).length; nudgeCount = db.nudges.length; }
  catch (e) { issues.push('store unreadable: ' + e.message); }

  return {
    ok: issues.length === 0,
    department: 'cartRecovery',
    store: FILE,
    config: {
      liveSend: config.liveSend,
      abandonAfterMinutes: config.abandonAfterMinutes,
      nudgeStepsMinutes: config.nudgeStepsMinutes,
      maxNudges: config.maxNudges,
      quietHours: `${config.quietStartHour}:00-${config.quietEndHour}:00`,
    },
    counts: { carts: cartCount, nudges: nudgeCount },
    issues, info,
  };
}

module.exports = { check };
