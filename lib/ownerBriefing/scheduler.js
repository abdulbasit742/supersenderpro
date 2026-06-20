// lib/ownerBriefing/scheduler.js — Schedule metadata only (no live cron started here).
// Reports the configured morning/evening times so an existing scheduler can honor them.

const { config } = require('./config');

function schedule() {
  return {
    timezone: config.timezone,
    morning: config.scheduleMorning,
    evening: config.scheduleEvening,
    dryRun: config.dryRun,
    note: 'These times are advisory. Wire them into the existing scheduler to auto-generate briefings.',
  };
}

module.exports = { schedule };
