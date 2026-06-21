'use strict';


/**
 * Mock Gateway — scenario catalog. Fake data only: example.com emails, masked
 * phones, DEMO-* refs, example.com webhook URLs. No real data, no secrets.
 */

const SCENARIOS = [
  { id: 'wa_order_confirmation', title: 'WhatsApp order confirmation preview', provider: 'whatsappBaileysMock', action:
'send_message', sampleInput: { to: '+1 555 0100', template: 'order_confirmation', vars: { name: 'Demo User', orderId:
'DEMO-ORDER-001' } } },
  { id: 'wa_payment_reminder', title: 'WhatsApp payment reminder preview', provider: 'whatsappBaileysMock', action:
'send_message', sampleInput: { to: '+1 555 0101', template: 'payment_pending', vars: { orderId: 'DEMO-ORDER-002', amount:
'PKR 4,500' } } },
  { id: 'wa_support_reply', title: 'WhatsApp support reply preview', provider: 'whatsappBaileysMock', action:
'send_message', sampleInput: { to: '+1 555 0102', body: 'Aap ki ticket DEMO-TKT-001 update ho gayi.' } },
  { id: 'wa_channel_post', title: 'WhatsApp Channel post preview', provider: 'channelPublisherMock', action: 'publish',
sampleInput: { channel: 'DEMO-CHANNEL', text: 'New drop! DEMO-ORDER pricing inside.' } },
  { id: 'social_post', title: 'Facebook/Instagram post preview', provider: 'socialPublisherMock', action: 'publish',
sampleInput: { platform: 'instagram', caption: 'Demo launch post', mediaUrl: 'https://example.com/demo.png' } },
  { id: 'ecom_order_received', title: 'Ecommerce order received preview', provider: 'ecommerceMock', action:
'create_order', sampleInput: { orderId: 'DEMO-ORDER-003', items: 2, total: 'PKR 9,000', customer: 'Demo User' } },
  { id: 'pay_approved', title: 'Payment verification approved preview', provider: 'paymentVerifierMock', action:
'verify', sampleInput: { ref: 'DEMO-PAY-001', amount: 'PKR 4,500', expected: 'PKR 4,500' } },
  { id: 'pay_rejected', title: 'Payment verification rejected preview', provider: 'paymentVerifierMock', action:
'verify', sampleInput: { ref: 'DEMO-PAY-002', amount: 'PKR 1,000', expected: 'PKR 4,500' } },
  { id: 'webhook_success', title: 'Webhook delivery success preview', provider: 'webhookDeliveryMock', action: 'deliver',
sampleInput: { url: 'https://example.com/webhook/demo', event: 'order.created', simulate: 'success' } },
  { id: 'webhook_failed', title: 'Webhook delivery failed preview', provider: 'webhookDeliveryMock', action: 'deliver',
sampleInput: { url: 'https://example.com/webhook/demo', event: 'order.created', simulate: 'fail' } },
  { id: 'ai_reply', title: 'AI reply generation preview', provider: 'aiProviderMock', action: 'complete', sampleInput: {
prompt: 'Reply to a buyer asking about price', persona: 'sales' } },
  { id: 'voice_transcript', title: 'Voice AI transcript preview', provider: 'voiceAIMock', action: 'transcribe',
sampleInput: { audioRef: 'DEMO-AUDIO-001', seconds: 12 } },
  { id: 'support_reply', title: 'Support ticket reply preview', provider: 'supportMock', action: 'reply', sampleInput: {
ticketId: 'DEMO-TKT-002', body: 'Thanks for reaching out!' } },
  { id: 'dev_api_event', title: 'Developer API event preview', provider: 'developerPortalMock', action: 'event',
sampleInput: { event: 'message.sent', apiKeyRef: 'DEMO-KEY-001' } },
  { id: 'audit_warning', title: 'Audit/security warning event preview', provider: 'auditSecurityMock', action: 'event',
sampleInput: { kind: 'suspicious_login', severity: 'high' } },
  { id: 'tenant_billing_upgrade', title: 'Tenant billing upgrade preview', provider: 'billingMock', action: 'upgrade',
sampleInput: { tenant: 'DEMO-TENANT-001', from: 'starter', to: 'pro' } },
  { id: 'approval_required', title: 'Approval required action preview', provider: 'auditSecurityMock', action:
'approval', sampleInput: { action: 'bulk_send', count: 500 } },
  { id: 'feature_flag_blocked', title: 'Feature flag blocked action preview', provider: 'developerPortalMock', action:

'flag_check', sampleInput: { flag: 'live_payments', enabled: false } },
];

function list() { return SCENARIOS.map(function (s) { return { id: s.id, title: s.title, provider: s.provider, action:
s.action }; }); }
function get(id) { return SCENARIOS.find(function (s) { return s.id === id; }) || null; }


module.exports = { SCENARIOS, list, get };
