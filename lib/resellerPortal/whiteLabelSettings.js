   'use strict';
   /** White-label settings per reseller. Preview-only by default; powered-by stays visible unless explicitly configured AND
   white-label enabled. */
   const store = require('./store');
   const privacyGuard = require('./privacyGuard');
   const brandingPreview = require('./brandingPreview');
   const domainPreview = require('./domainPreview');
   const safety = require('./safetyGuard');
   function defaults(resellerId, i) {
       i = i || {};
       return {
         resellerId, brandName: i.brandName || '', logoUrlPreview: i.logoUrlPreview || null,
         primaryColor: i.primaryColor || '#2f81f7', accentColor: i.accentColor || '#3fb950',
       publicSiteTitle: i.publicSiteTitle || '', supportEmailMasked: privacyGuard.maskValue(i.supportEmail ||
   i.supportEmailMasked || ''),
         supportPhoneMasked: privacyGuard.maskPhone(i.supportPhone || i.supportPhoneMasked || ''),
         customDomain: i.customDomain || null, domainStatus: 'not_configured', footerText: i.footerText || '',
         poweredByVisible: safety.allowWhiteLabel() ? (i.poweredByVisible !== false) : true,
         termsUrl: i.termsUrl || null, privacyUrl: i.privacyUrl || null, dryRun: true, updatedAt: new Date().toISOString(),
       };
   }
   function get(resellerId) { return (store.load().branding || {})[resellerId] || defaults(resellerId, {}); }
   function update(resellerId, patch) {
       const state = store.load(); state.branding = state.branding || {};
       const cur = state.branding[resellerId] || defaults(resellerId, {});
       const next = Object.assign({}, cur, defaults(resellerId, Object.assign({}, cur, patch)));
       const dp = domainPreview.preview(next.customDomain);
       next.domainStatus = dp.domainStatus;
       state.branding[resellerId] = next; store.save(state);
       store.appendHistory({ kind: 'branding_updated', resellerId });
       return { ok: true, settings: next };
   }
   function preview(resellerId, patch) {
       const s = Object.assign({}, get(resellerId), patch || {});
       return { ok: true, branding: brandingPreview.build(s), domain: domainPreview.preview(s.customDomain),
   whiteLabelEnabled: safety.allowWhiteLabel() };
   }
   module.exports = { defaults, get, update, preview };
