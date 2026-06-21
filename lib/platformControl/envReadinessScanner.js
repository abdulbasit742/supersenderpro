// lib/platformControl/envReadinessScanner.js — env KEY presence only; values never returned.
 'use strict';
 const cfg = require('./config');


 function envReadiness() {
   const keys = cfg.envKeyNames().filter((k) => !/^(npm_|_)/.test(k));
     return cfg.base({
       secretsExposed: false,
       envKeysPreview: keys,
       requiredKeysMissingPreview: cfg.REQUIRED_ENV_KEYS.filter((k) => !keys.includes(k)),
       optionalKeysMissingPreview: cfg.OPTIONAL_ENV_KEYS.filter((k) => !keys.includes(k)),
       configuredKeysMaskedPreview: keys.map((k) => ({ key: k, valueMasked: 'configured' })),
     });
 }


 module.exports = { envReadiness };
