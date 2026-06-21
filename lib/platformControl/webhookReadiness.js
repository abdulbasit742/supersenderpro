// lib/platformControl/webhookReadiness.js — webhook routes/files presence, no live webhook.
  'use strict';
  const cfg = require('./config');
  const { redactRoute } = require('./redactor');
  const { scanRoutes } = require('./routeInventory');


  function webhookReadiness() {
    const keys = cfg.envKeyNames();
       return cfg.base({
         liveWebhookEnabled: false,
         webhookRoutesPreview: scanRoutes().filter((r) => /webhook/i.test(r.path)).map(redactRoute),
         webhookFilesDetectedPreview: cfg.hasFile([/webhook/i]),
         verifyTokenPresentPreview: keys.includes('META_VERIFY_TOKEN') || keys.includes('WEBHOOK_VERIFY_TOKEN'),

      });
  }


  module.exports = { webhookReadiness };
