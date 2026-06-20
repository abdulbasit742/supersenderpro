// developerPortal/flowNodes.js — Flow Studio trigger/action registry entries (no live external execution).
const TRIGGERS = [
  { id:'developer_portal.app_created', label:'Developer App Created (preview)' },
  { id:'developer_portal.webhook_subscription_created', label:'Webhook Subscription Created (preview)' },
  { id:'developer_portal.webhook_delivery_blocked', label:'Webhook Delivery Blocked by Policy' },
  { id:'developer_portal.webhook_delivery_simulated', label:'Webhook Delivery Simulated' },
];
const ACTIONS = [
  { id:'create_developer_app_preview', label:'Create Developer App (preview)' },
  { id:'create_webhook_subscription_preview', label:'Create Webhook Subscription (preview)' },
  { id:'send_webhook_test_preview', label:'Send Webhook Test (dry-run)' },
  { id:'generate_api_docs', label:'Generate API Docs' },
  { id:'create_developer_notification', label:'Create Developer Notification' },
];
module.exports = { TRIGGERS, ACTIONS };
