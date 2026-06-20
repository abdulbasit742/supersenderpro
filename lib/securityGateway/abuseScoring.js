// lib/securityGateway/abuseScoring.js — Convert signals into an abuse score + risk level.
const WEIGHT = { low: 10, medium: 25, high: 45, critical: 70 };

function score(signals = []) {
  let s = 0;
  signals.forEach((sig) => { s += WEIGHT[sig.severity] || 10; });
  s = Math.min(100, s);
  let riskLevel = 'low';
  if (s >= 70) riskLevel = 'critical';
  else if (s >= 45) riskLevel = 'high';
  else if (s >= 20) riskLevel = 'medium';
  return { abuseScore: s, riskLevel };
}

module.exports = { score, WEIGHT };
