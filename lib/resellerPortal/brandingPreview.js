'use strict';
/** Builds a safe branding preview object from settings. No file uploads; URL/text only. */
function colorOk(c) { return typeof c === 'string' && /^#?[0-9a-f]{3,8}$/i.test(c); }
function build(settings) {
  const s = settings || {};
  return {
    brandName: s.brandName || 'Your Brand',
    primaryColor: colorOk(s.primaryColor) ? s.primaryColor : '#2f81f7',
    accentColor: colorOk(s.accentColor) ? s.accentColor : '#3fb950',
    logoUrlPreview: s.logoUrlPreview || null,
    publicSiteTitle: s.publicSiteTitle || (s.brandName ? s.brandName + ' Portal' : 'Portal'),
    footerText: s.footerText || '',
    poweredByVisible: s.poweredByVisible !== false, // visible by default
    previewHtml: '<div style="font-family:sans-serif"><strong style="color:' + (colorOk(s.primaryColor) ? s.primaryColor
: '#2f81f7') + '">' + (s.brandName || 'Your Brand') + '</strong></div>',
    dryRun: true,
  };
}
module.exports = { build, colorOk };
