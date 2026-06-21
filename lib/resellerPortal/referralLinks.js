'use strict';
/** Builds safe referral links + ref codes. No PII in URLs, no external shortener. */
const crypto = require('crypto');
function refCode(resellerId) { return 'REF' + String(resellerId || '').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase()
+ crypto.randomBytes(2).toString('hex').toUpperCase(); }
function build(params) {
  const p = params || {};
  const base = p.baseUrl || '';
  const code = p.referralCode || refCode(p.resellerId);
  const safe = (v) => String(v || '').replace(/[?#&=]/g, '').slice(0, 48);
  const utm = { utm_source: 'partner', utm_medium: 'referral', utm_campaign: safe(p.campaignCode || code), ref:
safe(code) };
  const qs = Object.entries(utm).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  return { referralCode: code, url: base ? base + (base.includes('?') ? '&' : '?') + qs : '(set baseUrl) ?' + qs, utm,
note: 'No PII in link; safe ref/UTM only.' };
}
module.exports = { build, refCode };
