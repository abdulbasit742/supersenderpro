// lib/platformControl/integrationHealth.js — integration module presence, no live calls.
  'use strict';
  const cfg = require('./config');


  const INTEGRATIONS = [
       { name: 'daraz', file: /daraz/i }, { name: 'shopify', file: /shopify/i },
       { name: 'woocommerce', file: /woo/i }, { name: 'magento', file: /magento/i },
       { name: 'jazzcash', file: /jazz/i }, { name: 'easypaisa', file: /easypaisa/i },
       { name: 'stripe', file: /stripe/i }, { name: 'paypal', file: /paypal/i },
       { name: 'n8n', file: /n8n/i }, { name: 'google_sheets', file: /sheet/i },
  ];


  function integrationHealth() {
       return cfg.base({
         externalCallsEnabled: false,
      integrationsPreview: INTEGRATIONS.map((i) => ({ name: i.name, detectedPreview: cfg.hasFile([i.file]),
  liveCallEnabled: false })),
       });
  }


  module.exports = { integrationHealth, INTEGRATIONS };
