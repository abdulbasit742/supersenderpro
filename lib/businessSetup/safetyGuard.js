  function globalDryRun() { return String(process.env.BUSINESS_SETUP_DRY_RUN || 'true') !== 'false'; }
  function requireApproval() { return String(process.env.BUSINESS_SETUP_REQUIRE_APPROVAL || 'true') !== 'false'; }
  function allowPresetWrite() { return String(process.env.BUSINESS_SETUP_ALLOW_PRESET_WRITE || 'false') === 'true'; }
  function allowLiveEnable() { return String(process.env.BUSINESS_SETUP_ALLOW_LIVE_ENABLE || 'false') === 'true'; }

  // Actions that are forbidden in this layer no matter what.
  const FORBIDDEN = [
    'send_whatsapp', 'post_social', 'post_channel', 'write_ecommerce',
       'approve_payment', 'enable_live_voice',
  ];

  function check(action) {
       const blockedReasons = [];
       if (FORBIDDEN.includes(action)) blockedReasons.push('action_forbidden_in_setup_layer');
       if (action === 'enable_module' && !allowLiveEnable()) blockedReasons.push('live_enable_disabled');
       if (action === 'persist_preset' && !allowPresetWrite()) blockedReasons.push('preset_write_disabled');
       return {
         allowed: blockedReasons.length === 0 && !globalDryRun() ? true : false,
         dryRun: globalDryRun(),
         blockedReasons,
         warnings: globalDryRun() ? ['global_dry_run_on'] : [],
       };
  }

  module.exports = { check, globalDryRun, requireApproval, allowPresetWrite, allowLiveEnable, FORBIDDEN };
