'use strict';


/**
 * Reseller Portal QA — public partner page QA. Reads public/partners.html + js
 * statically (read-only) and asserts form, consent, redaction, no live send, CTAs.
 */

const guard = require('./qaGuard');

function run() {
  const blockers = [], warnings = [];
  const pageExists = guard.exists('public/partners.html');
  if (!pageExists) { blockers.push('public/partners.html missing.'); return finalize(false, blockers, warnings, {}); }


  const html = guard.read('public/partners.html');
  const js = guard.read('public/js/partners.js');


  const hasForm = /<form[\s\S]*<\/form>/i.test(html);
  if (!hasForm) blockers.push('Partner inquiry form not found.');

  const hasConsent = /consent/i.test(html) && /type=\"checkbox\"/i.test(html);
  if (!hasConsent) blockers.push('Consent checkbox not found on partner form.');

  // The submit handler should require consent and hit the safe inquiry endpoint.
  const consentEnforced = /consent/i.test(js) && /partner-inquiry/i.test(js);
  if (!consentEnforced) warnings.push('Consent enforcement / inquiry endpoint not clearly wired in partners.js.');

  // No live send from the public page.
  if (/(twilio|sendgrid|nodemailer|whatsapp.*send|fetch\([^)]*mail)/i.test(js)) blockers.push('Public partner JS appears to send live messages.');

  // CTA + demo + funnel links.
  const hasCTA = /<a[^>]*class=\"[^\"]*cta/i.test(html) || /href=/.test(html);
  if (!hasCTA) warnings.push('No CTA link found on partner page.');
  const demoExists = guard.exists('public/demo-sandbox.html') || guard.exists('public/demo.html');
  if (demoExists && !/demo/i.test(html)) warnings.push('Demo sandbox exists but no demo link on partner page.');
  const funnelExists = guard.exists('public/funnel.html') || guard.exists('public/pricing.html');
  if (funnelExists && !/(pricing|funnel)/i.test(html)) warnings.push('Public funnel exists but not linked on partner page.');

  // Public response must be redacted — heuristic: handler does not echo raw inputs.
  if (/innerHTML\s*=\s*[^;]*p-(name|company|msg)/i.test(js)) warnings.push('Partner page may echo raw user input; ensure responses are redacted.');

  const leaks = guard.findLeaks(html + js);
  if (leaks.length) blockers.push('Public partner page exposes ' + leaks.join(', ') + '.');

  return finalize(blockers.length === 0, blockers, warnings, { pageExists: pageExists, hasForm: hasForm, hasConsent:
hasConsent, demoLinked: demoExists, funnelLinked: funnelExists });
}


function finalize(ok, blockers, warnings, detail) {
  return Object.assign({ ok: ok, status: blockers.length ? 'blocked' : (warnings.length ? 'warning' : 'verified'),
blockers: blockers, warnings: warnings, noLiveSend: blockers.indexOf('Public partner JS appears to send live messages.')
=== -1 }, detail);
}

module.exports = { run };
