// lib/complianceCenter/reportBuilder.js — Compliance summary across all subjects.
const registry = require('./consentRegistry');
const { config } = require('./config');
const rules = require('./complianceRules');

function summary(){
  const recs = registry.all();
  const channelCounts = {};
  registry.CHANNELS.forEach((c)=>{ channelCounts[c] = recs.filter((r)=>r.channels && r.channels[c]).length; });
  return {
    generatedAt: new Date().toISOString(),
    consentFirst: config.consentFirst,
    totalSubjects: recs.length,
    optedOut: recs.filter((r)=>r.optedOut).length,
    consentByChannel: channelCounts,
    activeRules: Object.values(rules).map((r)=>({ id:r.id, label:r.label, severity:r.severity })),
    quietHours: { start: config.quietHoursStart, end: config.quietHoursEnd, timezone: config.timezone },
  };
}
module.exports = { summary };
