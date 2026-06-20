// developerPortal/integrationApps.js — example integration app templates (docs/demo only).
const APPS = [
  { id:'n8n', name:'n8n', type:'n8n', description:'Trigger n8n flows from SuperSender webhook events (dry-run).', recommendedEvents:['public_funnel.lead_created','support.ticket_created'] },
  { id:'zapier', name:'Zapier-style', type:'zapier_style', description:'Connect to Zapier-style tools via webhooks.', recommendedEvents:['public_funnel.lead_created','reseller.referral_created'] },
  { id:'make', name:'Make.com-style', type:'make_style', description:'Scenario automation via webhook events.', recommendedEvents:['order_completed','billing.preview_created'] },
  { id:'crm', name:'Custom CRM', type:'custom_crm', description:'Sync redacted lead/customer previews to a custom CRM.', recommendedEvents:['customer360.profile_preview_created'] },
];
module.exports = { APPS };
