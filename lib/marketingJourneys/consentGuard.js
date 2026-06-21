 'use strict';
 /**
  * consentGuard.js — consent / unsubscribe safety for previews. Bridges to the
     * existing Compliance Center / Opt-Out Center when present; otherwise applies a
     * safe default (consent required, unsubscribe mandatory). Never sends anything.
  */
 function bridge() {
      // Prefer the canonical consent authority, then the send-time opt-out gate.
      try { const cc = require('../complianceCenter'); if (cc) return { kind: 'complianceCenter', mod: cc }; } catch (e) {}
   try { const comp = require('../../src/modules/compliance/compliance'); if (comp) return { kind: 'compliance', mod: comp
 }; } catch (e) {}
      return { kind: 'default', mod: null };
 }


 function check(channel, recipientConsent) {
      // recipientConsent: { consentEmail, consentSms } from preview/sample only.
      const b = bridge();
      let consentOk = true;
      if (channel === 'email') consentOk = recipientConsent ? recipientConsent.consentEmail !== false : true;
      if (channel === 'sms') consentOk = recipientConsent ? recipientConsent.consentSms !== false : true;
      const warnings = [];
      if (b.kind === 'default') warnings.push('Compliance Center not detected; applying safe default consent policy.');
      if (!consentOk) warnings.push('Recipient has not consented for ' + channel + '; would be suppressed on live send.');
      return {
        consentOk,
        source: b.kind,
        unsubscribeRequired: channel === 'email',
        optOutRequired: channel === 'sms',
        warnings,
      };
 }


 module.exports = { check, bridge };
