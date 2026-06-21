// lib/platformControl/featureFlags.js — known flags, presence only, safe-default OFF.
  'use strict';
  const cfg = require('./config');

  const FLAGS = [
    'PLATFORM_CONTROL_ENABLED', 'WHATSAPP_LIVE_SEND', 'WHATSAPP_CLOUD_ENABLED',
       'AI_LIVE_CALLS', 'PAYMENTS_ENABLED', 'QUEUE_ENABLED', 'RAG_ENABLED',
  ];


  function featureFlags() {
       const keys = cfg.envKeyNames();
       const flagsPreview = FLAGS.map((key) => ({
         key, configured: keys.includes(key), enabledPreview: false, source: 'env_preview', safeDefault: true,
       }));
       return cfg.base({ flagsPreview });
  }


  module.exports = { featureFlags, FLAGS };
