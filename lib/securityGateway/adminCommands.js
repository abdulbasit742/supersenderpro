// lib/securityGateway/adminCommands.js — Admin command hooks (concise Urdu/English mixed). No raw IP/PII/secrets.
// Integration point only: wire these handlers into the existing admin command system if available.
const gateway = require('./securityGateway');
const doctor = require('./securityDoctor');
const rateLimitPolicy = require('./rateLimitPolicy');
const eventWriter = require('./securityEventWriter');

const commands = {
  '!security': () => { const s = gateway.status(); return `🛡️ Security Gateway: ${s.enabled ? 'ON' : 'OFF'} | dry-run=${s.dryRun} | policies=${s.policyCount}. Sab report-only mode mein hai.`; },
  '!securityrisk': () => { const d = doctor.run(); return `📊 Security score: ${d.score}/100 (${d.status}). Blockers: ${d.blockers.length}.`; },
  '!ratelimits': () => { const d = rateLimitPolicy.defaults(); return `⏱️ Rate limits — public form: ${d.public_form.maxRequests}/${d.public_form.windowSeconds}s, developer API: ${d.developer_api.maxRequests}/${d.developer_api.windowSeconds}s, webhook: ${d.webhook.maxRequests}/${d.webhook.windowSeconds}s.`; },
  '!abuse': () => { const ev = eventWriter.list(5); return `🚨 Recent abuse signals: ${ev.length}. Sab redacted hain, koi raw IP/PII nahi.`; },
  '!securityevent': (id) => { const e = eventWriter.get(id); return e ? `🔎 Event ${e.id}: ${e.eventType} | risk=${e.riskLevel} | ${e.summary}` : `Event nahi mila: ${id}`; },
  '!securitydoctor': () => { const d = doctor.run(); return `🩺 Doctor: ${d.score}/100 ${d.status}. Next: ${(d.nextSteps[0] || 'all good')}.`; },
};

function handle(text) {
  const parts = String(text || '').trim().split(/\s+/);
  const cmd = parts[0];
  if (!commands[cmd]) return null;
  return commands[cmd](parts[1]);
}

module.exports = { commands, handle };
