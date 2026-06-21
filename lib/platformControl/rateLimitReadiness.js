// lib/platformControl/rateLimitReadiness.js — rate limit middleware presence.
  'use strict';
  const cfg = require('./config');


  function rateLimitReadiness() {
    const pkg = cfg.readJSON('package.json') || {};
      const deps = Object.assign({}, pkg.dependencies);
      const hasLimiter = !!deps['express-rate-limit'] || cfg.hasFile([/rate.?limit/i]);
      return cfg.base({
        rateLimitMiddlewareDetectedPreview: hasLimiter,

       throttleConfigDetectedPreview: cfg.hasFile([/throttle/i]),
       perRouteLimitDetectedPreview: false,
       recommendedPreview: !hasLimiter,
     });
 }


 module.exports = { rateLimitReadiness };
