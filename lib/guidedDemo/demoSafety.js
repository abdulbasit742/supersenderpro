'use strict';
function dryRun() { return String(process.env.GUIDED_DEMO_DRY_RUN || 'true') !== 'false'; }
function sampleDataOnly() { return String(process.env.GUIDED_DEMO_SAMPLE_DATA_ONLY || 'true') !== 'false'; }
function mockProvidersOnly() { return String(process.env.GUIDED_DEMO_MOCK_PROVIDERS_ONLY || 'true') !== 'false'; }
function liveActions() { return String(process.env.GUIDED_DEMO_LIVE_ACTIONS || 'false') === 'true'; }
function externalCalls() { return String(process.env.GUIDED_DEMO_EXTERNAL_CALLS || 'false') === 'true'; }
function panel() { return { dryRun:dryRun(), sampleDataOnly:sampleDataOnly(), mockProvidersOnly:mockProvidersOnly(), liveActionsEnabled:liveActions(), externalCallsEnabled:externalCalls(), redactPII:true, redactSecrets:true, note:'Demo only. No live WhatsApp/email/webhooks/payments/AI/ecommerce. No tenant/auth writes. No external network.' }; }
module.exports = { dryRun, sampleDataOnly, mockProvidersOnly, liveActions, externalCalls, panel };
