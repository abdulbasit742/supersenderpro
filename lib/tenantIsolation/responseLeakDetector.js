// lib/tenantIsolation/responseLeakDetector.js — Detect leaks in an API response/payload. Never prints raw secrets.
const payloadScanner = require('./payloadScanner');

function severityRank(s) { return { low: 1, medium: 2, high: 3, critical: 4 }[s] || 1; }
function detect(payload, ctx = {}) {
  const { findings, redactedPreview } = payloadScanner.scan(payload, ctx);
  const leakCount = findings.reduce((a, f) => a + f.count, 0);
  const leakFound = leakCount > 0;
  let riskLevel = 'low';
  findings.forEach((f) => { if (severityRank(f.severity) > severityRank(riskLevel)) riskLevel = f.severity; });
  const blockers = findings.filter((f) => f.severity === 'critical').map((f) => f.type);
  const warnings = findings.filter((f) => f.severity !== 'critical').map((f) => f.type);
  return { leakFound, leakCount, riskLevel, redactedPreview, findings, blockers, warnings };
}
module.exports = { detect };
