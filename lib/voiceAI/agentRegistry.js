// lib/voiceAI/agentRegistry.js — Catalog of voice agents. Agents are rule-based by default
// and never auto-send. They orchestrate on top of existing AI/CRM if available.

module.exports = {
  sales_voice_agent: { id: 'sales_voice_agent', label: 'Sales Voice Agent', defaultTone: 'enthusiastic', escalates: false },
  support_voice_agent: { id: 'support_voice_agent', label: 'Support Voice Agent', defaultTone: 'friendly', escalates: true },
  payment_reminder_voice_agent: { id: 'payment_reminder_voice_agent', label: 'Payment Reminder Agent', defaultTone: 'calm', escalates: false },
  renewal_voice_agent: { id: 'renewal_voice_agent', label: 'Renewal Agent', defaultTone: 'professional', escalates: false },
  ecommerce_deal_voice_agent: { id: 'ecommerce_deal_voice_agent', label: 'Ecommerce Deal Agent', defaultTone: 'enthusiastic', escalates: false },
  order_followup_voice_agent: { id: 'order_followup_voice_agent', label: 'Order Follow-up Agent', defaultTone: 'friendly', escalates: false },
  complaint_resolution_voice_agent: { id: 'complaint_resolution_voice_agent', label: 'Complaint Resolution Agent', defaultTone: 'apologetic', escalates: true },
  onboarding_voice_agent: { id: 'onboarding_voice_agent', label: 'Onboarding Agent', defaultTone: 'friendly', escalates: false },
  group_moderation_voice_agent: { id: 'group_moderation_voice_agent', label: 'Group Moderation Agent', defaultTone: 'professional', escalates: true },
  channel_voiceover_agent: { id: 'channel_voiceover_agent', label: 'Channel Voiceover Agent', defaultTone: 'enthusiastic', escalates: false },
};
