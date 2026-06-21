'use strict';
const healthAggregator = require('./healthAggregator');
const detector = require('./incidentDetector');
const incidentStore = require('./incidentStore');
const runbooks = require('./runbooks');
const PREFIXES = ['!incidentstatus','!health','!critical','!warnings','!doctor','!runbook','!ack','!resolve','!snooze','!healthreport'];
function isIncidentCommand(text) { const t = String(text || '').trim().toLowerCase(); return PREFIXES.some((p) => t === p || t.indexOf(p + ' ') === 0); }
function reply(text, extra) { return Object.assign({ ok: true, dryRun: true, liveSend: false, text: String(text || '') }, extra || {}); }
function handle(text) {
  const t = String(text || '').trim(); const parts = t.split(/\s+/); const c = (parts.shift() || '').toLowerCase();
  try {
    if (c === '!health' || c === '!incidentstatus') { const run = healthAggregator.run(false); return reply('Health score: ' + run.score + '/100 | worst: ' + run.worstStatus + '. Modules checked: ' + run.records.length + '.'); }
    if (c === '!critical') { const det = detector.detect(); const crit = det.candidates.filter((x) => x.severity === 'critical'); return reply(crit.length ? 'Critical: ' + crit.map((x) => x.moduleName + ' (' + x.summary + ')').join('; ') : 'Koi critical incident nahi.'); }
    if (c === '!warnings') { const det = detector.detect(); const warn = det.candidates.filter((x) => x.severity === 'low' || x.severity === 'medium'); return reply(warn.length ? warn.length + ' warning(s): ' + warn.slice(0, 5).map((x) => x.moduleName).join(', ') : 'No warnings.'); }
    if (c === '!doctor' || c === '!healthreport') { const det = detector.detect(); return reply('Doctor: ' + det.candidateCount + ' issue(s). Score ' + det.healthScore + '/100. Detail dashboard pe dekhein.'); }
    if (c === '!runbook') { const rb = runbooks.get(parts[0]); return reply(rb ? (rb.title + ': ' + rb.steps.slice(0, 3).join(' | ')) : 'Runbook not found.'); }
    if (c === '!ack') { const rec = incidentStore.ack(parts[0]); return reply(rec ? 'Incident acknowledged.' : 'Incident not found.'); }
    if (c === '!resolve') { const rec = incidentStore.resolve(parts[0]); return reply(rec ? 'Incident resolved preview.' : 'Incident not found.'); }
    if (c === '!snooze') { const rec = incidentStore.snooze(parts[0], parts[1] || 60); return reply(rec ? 'Incident snoozed preview.' : 'Incident not found.'); }
    return reply('Unknown incident command.');
  } catch (err) { return reply('Incident command failed safely: ' + (err && err.message ? err.message : err)); }
}
module.exports = { PREFIXES, isIncidentCommand, handle, reply };
