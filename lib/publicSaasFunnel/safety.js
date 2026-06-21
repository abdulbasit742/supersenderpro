'use strict';
function dryRun() { return String(process.env.PUBLIC_FUNNEL_DRY_RUN || 'true') !== 'false'; }
function requireConsent() { return String(process.env.PUBLIC_FUNNEL_REQUIRE_CONSENT || 'true') !== 'false'; }
function allowLiveEmail() { return String(process.env.PUBLIC_FUNNEL_ALLOW_LIVE_EMAIL || 'false') === 'true'; }
function allowTenantWrite() { return String(process.env.PUBLIC_FUNNEL_ALLOW_TENANT_WRITE || 'false') === 'true'; }
function allowPaymentCapture() { return String(process.env.PUBLIC_FUNNEL_ALLOW_PAYMENT_CAPTURE || 'false') === 'true'; }
module.exports = { dryRun, requireConsent, allowLiveEmail, allowTenantWrite, allowPaymentCapture };
