// lib/platformControl/securityPosture.js — posture preview, secrets never exposed.
  'use strict';
  const cfg = require('./config');
  const { publicPageSafetyScanner } = require('./publicPageSafetyScanner');


  function securityPosture() {
    const pkg = cfg.readJSON('package.json') || {};
      const deps = Object.assign({}, pkg.dependencies);
      const pub = publicPageSafetyScanner();
      const authRiskPreview = [];
      if (!deps.helmet) authRiskPreview.push('helmet not detected');
      if (!deps['express-rate-limit']) authRiskPreview.push('rate limiter not detected');
      if (!cfg.hasFile([/auth/i])) authRiskPreview.push('no auth module detected');
      return cfg.base({
        secretsExposed: false,
        piiMasked: true,
        publicSecretsRiskPreview: (pub.secretLikeFindingsPreview || []).length > 0,
        rawLogRiskPreview: false,
        helmetDetectedPreview: !!deps.helmet,
        corsDetectedPreview: !!deps.cors,
        authRiskPreview,
      });
  }


  module.exports = { securityPosture };
