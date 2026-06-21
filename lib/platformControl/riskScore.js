// lib/platformControl/riskScore.js — weighted risk from guard + posture + PII.
  'use strict';
  const cfg = require('./config');
  const { safetyGuardReport } = require('./safetyGuardReport');
  const { securityPosture } = require('./securityPosture');
  const { piiLeakScannerPreview } = require('./piiLeakScannerPreview');


  function riskScore() {
    const guard = safetyGuardReport();
      const sec = securityPosture();
      const pii = piiLeakScannerPreview();
      let risk = 0; const riskSignalsPreview = [];
      guard.blockers.forEach((b) => { risk += 25; riskSignalsPreview.push({ signal: b, weight: 25 }); });
      guard.warnings.forEach((w) => { risk += 5; riskSignalsPreview.push({ signal: w, weight: 5 }); });
      if (sec.authRiskPreview.length) { const wgt = sec.authRiskPreview.length * 5; risk += wgt; riskSignalsPreview.push({
  signal: 'auth posture gaps', weight: wgt }); }
    if (pii.piiFindingsPreview.length) { risk += 10; riskSignalsPreview.push({ signal: 'possible hardcoded PII', weight: 10
  }); }
    risk = Math.min(100, risk);
      const riskLevelPreview = risk >= 60 ? 'high' : risk >= 30 ? 'medium' : 'low';
      return cfg.base({ riskScorePreview: risk, riskLevelPreview, riskSignalsPreview });
  }


  module.exports = { riskScore };
