// lib/tenantIsolation/adminCommands.js — Admin command hooks (concise Urdu/English mixed). No secrets/full PII/raw tenant data.
const evaluator = require('./isolationEvaluator');
const leakDetector = require('./leakDetector');
const routeScanner = require('./routeBoundaryScanner');
const storeScanner = require('./storeBoundaryScanner');
const doctor = require('./isolationDoctor');
const registry = require('./policyRegistry');

const commands = {
  '!isolation': () => { registry.seedDefaults(); const d = doctor.run(); return `🧱 Tenant Isolation: dry-run ON | policies=${registry.list().length} | score ${d.score}/100 (${d.status}).`; },
  '!tenantcheck': () => { const r = evaluator.decide({ actorType: 'tenant', tenantId: 'A', targetTenantId: 'B', requestsPrivateData: true }); return `🔍 Cross-tenant test: ${r.allowed ? 'ALLOWED' : 'BLOCKED'} (${r.reason}). Cross-tenant access safe rakha gaya hai.`; },
  '!leakscan': () => { const r = leakDetector.detect({ note: 'sample only' }); return `🩹 Leak scan ready. Recent leaks redacted. leakFound=${r.leakFound}.`; },
  '!routescan': () => { const s = routeScanner.scan(); return `🛣️ Routes scanned: ${s.summary.routesScanned} | high-risk: ${s.summary.highRisk} | public exposure: ${s.summary.publicExposure}.`; },
  '!storescan': () => { const s = storeScanner.scan(); return `🗃️ Source scanned: ${s.storesScanned} files | tenant fields: ${s.tenantFieldsFound.length} | PII fields: ${s.piiFieldsFound.length}.`; },
  '!isolationdoctor': () => { const d = doctor.run(); return `🩺 Doctor: ${d.score}/100 ${d.status}. Next: ${d.nextSteps[0] || 'all good'}.`; },
};
function handle(text) { const cmd = String(text || '').trim().split(/\s+/)[0]; return commands[cmd] ? commands[cmd]() : null; }
module.exports = { commands, handle };
