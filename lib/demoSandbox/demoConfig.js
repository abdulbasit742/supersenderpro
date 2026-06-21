 'use strict';
 /**
     * lib/demoSandbox/demoConfig.js
     * Demo config with safe defaults. Live actions blocked, dry-run on.
  */
 const store = require('./store');


 function defaults() {
      const now = new Date().toISOString();
      return {
        enabled: String(process.env.DEMO_SANDBOX_ENABLED || 'true') === 'true',
        dryRun: String(process.env.DEMO_SANDBOX_DRY_RUN || 'true') !== 'false',
        demoTenantId: 'demo_tenant_001',

       demoBusinessName: 'Demo Business',
       demoIndustry: process.env.DEMO_SANDBOX_DEFAULT_SCENARIO || 'ai_tools_reseller',
       demoLanguage: 'roman_urdu',
       demoCurrency: 'PKR',
       demoCountry: 'PK',
       scenario: process.env.DEMO_SANDBOX_DEFAULT_SCENARIO || 'ai_tools_reseller',
       showDemoBadges: String(process.env.DEMO_SANDBOX_SHOW_BADGES || 'true') === 'true',
       blockLiveActions: String(process.env.DEMO_SANDBOX_BLOCK_LIVE_ACTIONS || 'true') !== 'false',
       createdAt: now,
       updatedAt: now,
     };
}
function get() { const s = store.load(); return s.config || defaults(); }
function update(patch) {
  const s = store.load();
     const cur = s.config || defaults();
     const next = Object.assign({}, cur, patch, { updatedAt: new Date().toISOString() });
     // safety floor: these can never be flipped off via config
     next.dryRun = true; next.blockLiveActions = true;
     s.config = next; store.save(s);
     store.appendHistory({ kind: 'config_updated' });
     return next;
}
module.exports = { defaults, get, update };
