'use strict';

/**
    * Reseller Portal QA — custom domain safety. Asserts no automatic DNS/SSL and that
    * custom domains are disabled by default. Advisory checklist only.
    */

const guard = require('./qaGuard');


function run() {
  const customDomainOn = guard.boolEnv('RESELLER_PORTAL_ALLOW_CUSTOM_DOMAIN', false);
     const blockers = [], warnings = [];
     if (customDomainOn) blockers.push('RESELLER_PORTAL_ALLOW_CUSTOM_DOMAIN=true: custom domains must stay manual + off by default.');


     return {
       ok: blockers.length === 0,
         customDomainEnabled: customDomainOn,
         dnsAutomation: false,
         sslAutomation: false,
         blockers: blockers,
         warnings: warnings,
         checklist: [
           'Custom domain is a MANUAL checklist; the portal never configures DNS.',
           'SSL is never auto-issued by the portal.',
           'Verify domain ownership out-of-band before enabling.',
           'Keep powered-by visible unless white-label is explicitly enabled.',
         ],
     };
}

module.exports = { run };
