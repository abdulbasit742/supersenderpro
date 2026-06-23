// lib/platformControl/securityPosture.js — read-only security posture preview. No secret/PII exposure.
'use strict';
const cfg = require('./config');
const { getPiiLeakPreview } = require('./piiLeakScannerPreview');

function getSecurityPosture() {
  const pii = getPiiLeakPreview();
  const publicSecretsRiskPreview = (pii.totalFindingsPreview || 0) > 0;
  // raw log risk: any *.log file inside public/
  const rawLogRiskPreview = cfg.listFiles('public', '.log').length > 0;
  const authKeys = ['SESSION_SECRET', 'JWT_SECRET', 'ADMIN_PASSWORD', 'ENCRYPTION_KEY'];
  const authRiskPreview = authKeys.filter((k) => !process.env[k]).map((k) => 'missing:' + k);
  const helmetHintPreview = /helmet|csp|contentSecurityPolicy/i.test(cfg.readText('server.js'));
  return cfg.safetyFlags({
    secretsExposed: false,
    piiMasked: true,
    publicSecretsRiskPreview,
    rawLogRiskPreview,
    authRiskPreview,
    securityHeadersHintPreview: helmetHintPreview,
    securityModulePreview: cfg.anyExists(['lib/securityGateway', 'routes/securityGatewayRoutes.js']),
    warnings: (publicSecretsRiskPreview || rawLogRiskPreview || authRiskPreview.length) ? ['security_signals_present_preview'] : [],
    blockers: [],
  });
}
module.exports = { getSecurityPosture };
