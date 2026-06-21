// lib/platformControl/templateReadiness.js — template modules/store presence.
  'use strict';
  const cfg = require('./config');


  function templateReadiness() {
      return cfg.base({
        templateModulesDetectedPreview: cfg.hasFile([/template/i]),
        templateStoreDetectedPreview: cfg.exists('data/templates.json') || cfg.hasFile([/template.*store|store.*template/i]),
        cloudTemplateSyncDetectedPreview: cfg.hasFile([/template.*cloud|cloud.*template/i]),
      });
  }


  module.exports = { templateReadiness };
