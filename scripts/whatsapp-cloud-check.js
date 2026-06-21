#!/usr/bin/env node
 'use strict';


 /**
  * Safe CLI config check for the WhatsApp Cloud API lane.
  * - Prints a summary only. Never prints secrets.
  * - Never calls Meta.
  * - Exit 0 always, UNLESS WHATSAPP_CLOUD_CHECK_STRICT=true and required config is missing (then exit 1).
  *
  * Usage: node scripts/whatsapp-cloud-check.js
  */


 const configInspector = require('../lib/whatsappCloudSetup/configInspector');

 function main() {
   const cfg = configInspector.inspectConfig();
   const p = cfg.safeMaskedPreview;

   console.log('WhatsApp Cloud API — config check (secret-safe)');
   console.log('------------------------------------------------');
   console.log('Enabled:        ' + (cfg.enabled ? 'yes' : 'no'));
   console.log('Dry-run:          ' + (p.dryRun ? 'true' : 'false'));
   console.log('Live-test:        ' + (p.liveTest ? 'true' : 'false'));
   console.log('API version:    ' + p.apiVersion);
   console.log('Phone number ID:' + ' ' + p.phoneNumberId);
   console.log('WABA ID:          ' + p.businessAccountId);
   console.log('Access token:     ' + p.accessToken);
   console.log('Verify token: ' + p.verifyToken);
   console.log('Webhook secret: ' + p.webhookSecret);
   console.log('Configured:       ' + (cfg.configured ? 'yes' : 'no'));

   if (cfg.missing.length) {
     console.log(' Missing required:');
     cfg.missing.forEach(function (m) { console.log('      - ' + m); });
   }
   if (cfg.warnings.length) {
     console.log(' Warnings:');
       cfg.warnings.forEach(function (w) { console.log('    - ' + w); });
   }
   if (cfg.nextSteps.length) {
     console.log(' Next steps:');
     cfg.nextSteps.forEach(function (s) { console.log('      - ' + s); });
   }

  const strict = configInspector.boolEnv('WHATSAPP_CLOUD_CHECK_STRICT', false);
  if (strict && !cfg.configured) {
    console.error(' STRICT mode: required config missing. Exiting 1.');
  process.exit(1);
  }
  process.exit(0);
}

try {
main();
} catch (e) {
// Never leak internals; keep it non-fatal unless strict mode already exited.
  console.error('Check failed to run cleanly.');
  process.exit(0);
}
