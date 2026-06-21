'use strict';

/**
    * Reseller Portal QA — referral link QA. Reads the existing referralTracker link
    * preview and asserts it has no PII/token and uses a safe campaign code.
    */

const guard = require('./qaGuard');
const validator = require('./referralCodeValidator');

function run(resellerId) {
     const referrals = guard.loadPortal('referralTracker');
     if (!referrals || typeof referrals.linkPreview !== 'function') {

    return { valid: false, status: 'unavailable', referralCode: null, safeLinkPreview: null, warnings: [], blockers:
['referral module not available'] };
}


  let link;
  try { link = referrals.linkPreview({ resellerId: resellerId || 'qa_sample', baseUrl: '/partners.html' }); }
  catch (e) { return { valid: false, status: 'error', referralCode: null, safeLinkPreview: null, warnings: [], blockers:
['referral link preview failed safely'] }; }

  const url = (link && (link.url || link.link || link.safeLinkPreview)) || '';
  const code = (link && (link.code || link.referralCode)) || (String(url).match(/[?&](?:ref|utm_campaign)=([^&]+)/) ||
[])[1] || '';
const blockers = [], warnings = [];

  const leaks = guard.findLeaks(url);
  if (leaks.length) blockers.push('Referral link exposes ' + leaks.join(', ') + '.');
  if (!/utm_/.test(String(url))) warnings.push('Referral link missing UTM/campaign parameters.');

  const codeCheck = validator.validate(code);
  codeCheck.blockers.forEach(function (b) { blockers.push(b); });
  codeCheck.warnings.forEach(function (w) { warnings.push(w); });

  return {
    valid: blockers.length === 0,
    status: blockers.length ? 'blocked' : (warnings.length ? 'warning' : 'verified'),
    referralCode: code || null,
    safeLinkPreview: leaks.length ? '[redacted]' : url,
    warnings: warnings,
    blockers: blockers,
  };
}

module.exports = { run };
