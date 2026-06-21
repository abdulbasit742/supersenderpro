'use strict';


/**
    * Reseller Portal QA — white-label branding QA. Reads the existing whiteLabelSettings
    * preview read-only and asserts it is safe. Never uploads files, configures DNS,
    * issues SSL, or calls external services.
    */

const guard = require('./qaGuard');

function run(resellerId) {
     const whiteLabel = guard.loadPortal('whiteLabelSettings');
     if (!whiteLabel || typeof whiteLabel.preview !== 'function') {
    return { ok: false, status: 'unavailable', blockers: ['white-label module not available'], warnings: [], preview:
null, nextSteps: ['Ensure lib/resellerPortal/whiteLabelSettings.js exists.'] };
     }


     let preview;
     try { preview = whiteLabel.preview(resellerId || 'qa_sample', { brandName: 'QA Brand', primaryColor: '#2f81f7' }); }
  catch (e) { return { ok: false, status: 'error', blockers: ['branding preview failed safely'], warnings: [], preview:
null, nextSteps: [] }; }


     const b = (preview && preview.branding) || {};
     const blockers = [], warnings = [], nextSteps = [];


     if (!b.brandName) warnings.push('Brand name not set in preview.');
     // logo must be a URL/text preview only, not an upload
  if (b.logoUrl && !/^https?:\/\//.test(String(b.logoUrl))) warnings.push('Logo should be a preview URL, not an upload.');
     // custom domain must be off by default
     const customDomainOn = guard.boolEnv('RESELLER_PORTAL_ALLOW_CUSTOM_DOMAIN', false);
     if (customDomainOn) blockers.push('Custom domain is enabled; must be off by default (no DNS/SSL automation).');
     // powered-by should remain visible unless white-label explicitly enabled
     const whiteLabelOn = guard.boolEnv('RESELLER_PORTAL_ALLOW_WHITE_LABEL', false);
     if (!whiteLabelOn && b.poweredByVisible === false) warnings.push('Powered-by hidden while white-label is disabled.');
     // support contact must be masked
     const leaks = guard.findLeaks(preview);
     if (leaks.length) blockers.push('Branding preview exposes PII/secret: ' + leaks.join(', '));

     if (customDomainOn) nextSteps.push('Set RESELLER_PORTAL_ALLOW_CUSTOM_DOMAIN=false until DNS/SSL reviewed.');
     if (!whiteLabelOn) nextSteps.push('Keep powered-by visible until white-label is explicitly enabled.');

     return { ok: blockers.length === 0, status: blockers.length ? 'blocked' : (warnings.length ? 'warning' : 'verified'),
blockers: blockers, warnings: warnings, preview: guard.findLeaks(preview).length ? '[redacted]' : preview, nextSteps:
nextSteps };
}

module.exports = { run };
