  'use strict';
  /**
   * lib/demoSandbox/demoModeGuard.js
      * Blocks any live action while in demo mode. Always returns blocked for live ops.
      */
  const demoConfig = require('./demoConfig');

  const LIVE_ACTIONS = ['send_whatsapp', 'post_channel', 'post_social', 'capture_payment', 'create_tenant',
  'external_api_call', 'write_business_module'];

  function allowRealData() { return String(process.env.DEMO_SANDBOX_ALLOW_REAL_DATA || 'false') === 'true'; }
  function allowExternalCalls() { return String(process.env.DEMO_SANDBOX_ALLOW_EXTERNAL_CALLS || 'false') === 'true'; }

  function check(action) {
    const cfg = demoConfig.get();
       const blockedReasons = [];
       if (cfg.blockLiveActions && LIVE_ACTIONS.includes(action)) blockedReasons.push('demo_mode_blocks_live_actions');
       if (action === 'use_real_data' && !allowRealData()) blockedReasons.push('real_data_disabled');
       if (action === 'external_api_call' && !allowExternalCalls()) blockedReasons.push('external_calls_disabled');
       return { allowed: blockedReasons.length === 0, demo: true, dryRun: true, blockedReasons };
  }
  function safetyPanel() {
    return {
         realDataDisabled: !allowRealData(),
         externalApisDisabled: !allowExternalCalls(),
         liveSendingDisabled: true,
         paymentCaptureDisabled: true,
         tenantWriteDisabled: true,

      blockedActions: LIVE_ACTIONS,
    };
}
module.exports = { check, safetyPanel, LIVE_ACTIONS };
