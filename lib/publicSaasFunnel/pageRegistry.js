// lib/publicSaasFunnel/pageRegistry.js
// Static content registry for public pages: features + industry use cases.
// Pure data; no secrets, no tenant/runtime data.

const FEATURES = [
  { key: 'whatsapp_crm', name: 'WhatsApp CRM', what: 'Capture, tag and follow up WhatsApp conversations in one inbox.', who: 'Sales & support teams drowning in scattered chats.', example: 'Auto-tag a new buyer and queue a follow-up draft.', safety: 'Drafts only by default — no auto-sends without approval.', cta: 'Request Demo' },
  { key: 'whatsapp_channels', name: 'WhatsApp Channels', what: 'Plan and schedule channel broadcasts with approval gates.', who: 'Content & offer channels.', example: 'Schedule a daily offer post for review.', safety: 'Consent + opt-out respected; no spam.', cta: 'Request Demo' },
  { key: 'social_bridge', name: 'Social Bridge', what: 'Bridge posts across social channels from one place.', who: 'Multi-channel marketers.', example: 'Cross-post a launch announcement draft.', safety: 'Dry-run scheduling; manual approve.', cta: 'Request Demo' },
  { key: 'ecommerce_automation', name: 'Ecommerce Automation', what: 'Sync catalog, orders and updates without manual effort.', who: 'Online stores & dealers.', example: 'Draft an order-status update message.', safety: 'No live order writes by default.', cta: 'Request Demo' },
  { key: 'customer_360', name: 'Customer 360', what: 'Unified customer profile across channels.', who: 'Anyone needing one view of the customer.', example: 'See order + chat + plan history together.', safety: 'PII masked; no live writes from funnel.', cta: 'Request Demo' },
  { key: 'voice_ai', name: 'Voice AI', what: 'Generate voice scripts and voiceovers safely.', who: 'Stores & channels using audio.', example: 'Draft a voice follow-up script.', safety: 'External AI off by default.', cta: 'Request Demo' },
  { key: 'marketplace_intel', name: 'Marketplace Intelligence', what: 'Track competitors and marketplace signals.', who: 'Sellers & resellers.', example: 'Compare feature parity vs a competitor.', safety: 'Read-only intelligence; dry-run.', cta: 'Request Demo' },
  { key: 'ai_agents', name: 'AI Agents', what: 'Deploy task-focused AI agents with guardrails.', who: 'Teams automating repetitive flows.', example: 'An agent drafts replies for approval.', safety: 'Approval-gated; no autonomous sends.', cta: 'Request Demo' },
  { key: 'playbooks', name: 'Playbooks / SOPs', what: 'Reusable workflows and standard operating procedures.', who: 'Growing teams needing consistency.', example: 'Run an onboarding playbook preview.', safety: 'Preview-only by default.', cta: 'Request Demo' },
  { key: 'owner_command', name: 'Owner Command Daily Briefing', what: 'A daily briefing of what matters and what to do next.', who: 'Business owners.', example: 'Morning briefing with top 3 actions.', safety: 'Read-only aggregation; dry-run delivery.', cta: 'Request Demo' },
  { key: 'kpi_analytics', name: 'KPI Analytics', what: 'Track growth, conversion and funnel KPIs.', who: 'Owners & marketers.', example: 'Demo/trial request conversion rate.', safety: 'Aggregated metrics only.', cta: 'Request Demo' },
  { key: 'saas_billing', name: 'SaaS Billing', what: 'Plans, trials and upgrade requests.', who: 'SaaS sellers & resellers.', example: 'Create a trial request draft.', safety: 'No live payment capture from funnel.', cta: 'Compare Plans' },
  { key: 'compliance_safety', name: 'Compliance & Safety', what: 'Consent, opt-out, suppression and privacy masking.', who: 'Every regulated business.', example: 'Block follow-up when consent is missing.', safety: 'Consent enforced by default.', cta: 'Talk to Sales' },
  { key: 'backup_monitoring', name: 'Backup & Monitoring', what: 'Backups and health monitoring.', who: 'Ops-minded teams.', example: 'Scheduled backup status check.', safety: 'No secrets exposed.', cta: 'Talk to Sales' },
];

const USE_CASES = [
  { key: 'ai_tools_reseller', name: 'AI Tools Reseller', problem: 'Selling AI tool subscriptions but follow-up and billing are manual.', modules: ['saas_billing', 'whatsapp_crm', 'ai_agents'], workflow: 'Lead → trial request draft → plan recommendation → follow-up draft.', benefits: 'Faster conversion, organized resellers, fewer missed leads.', preset: 'ai_tools_reseller' },
  { key: 'ecommerce_store', name: 'Ecommerce Store', problem: 'Orders, chats and posts are scattered across apps.', modules: ['ecommerce_automation', 'customer_360', 'whatsapp_crm'], workflow: 'Order update drafts + customer 360 view + channel posts.', benefits: 'Less manual work, faster replies, repeat sales.', preset: 'ecommerce' },
  { key: 'wholesale_dealer', name: 'Wholesale Dealer', problem: 'Bulk buyers need fast quotes and order tracking.', modules: ['whatsapp_crm', 'customer_360', 'kpi_analytics'], workflow: 'Quote drafts + buyer profiles + order status.', benefits: 'Quicker quotes, repeat orders, clear pipeline.', preset: 'wholesale' },
  { key: 'education_channel', name: 'Education / Scholarship Channel', problem: 'High inbound volume, manual answers.', modules: ['whatsapp_channels', 'ai_agents', 'compliance_safety'], workflow: 'Channel posts + FAQ agent drafts + consent.', benefits: 'Scale answers without spam.', preset: 'education' },
  { key: 'jobs_channel', name: 'Jobs Channel', problem: 'Posting jobs and screening replies manually.', modules: ['whatsapp_channels', 'ai_agents'], workflow: 'Job post drafts + applicant reply drafts.', benefits: 'Faster posting, organized applicants.', preset: 'jobs' },
  { key: 'digital_agency', name: 'Digital Agency', problem: 'Managing many client accounts and reports.', modules: ['owner_command', 'kpi_analytics', 'playbooks'], workflow: 'Client briefings + KPI reports + reusable playbooks.', benefits: 'Scale clients with consistency.', preset: 'agency' },
  { key: 'restaurant_food', name: 'Restaurant / Food', problem: 'Orders and reservations over chat are messy.', modules: ['whatsapp_crm', 'ecommerce_automation'], workflow: 'Order drafts + reservation follow-ups.', benefits: 'Fewer missed orders, repeat diners.', preset: 'restaurant' },
  { key: 'real_estate', name: 'Real Estate', problem: 'Lead follow-up is slow and inconsistent.', modules: ['whatsapp_crm', 'customer_360', 'voice_ai'], workflow: 'Lead capture + follow-up drafts + voice scripts.', benefits: 'Faster lead response, more viewings.', preset: 'real_estate' },
  { key: 'content_channel', name: 'Sticker / Content Channel', problem: 'Posting and monetizing content manually.', modules: ['whatsapp_channels', 'social_bridge'], workflow: 'Scheduled post drafts across channels.', benefits: 'Consistent posting, more reach.', preset: 'content' },
  { key: 'local_shop', name: 'Local Shop', problem: 'No system for customer follow-up.', modules: ['whatsapp_crm', 'customer_360'], workflow: 'Capture walk-in leads + follow-up drafts.', benefits: 'Repeat customers, organized contacts.', preset: 'local_shop' },
  { key: 'custom_business', name: 'Custom Business', problem: 'Unique workflow that needs tailoring.', modules: ['playbooks', 'ai_agents', 'owner_command'], workflow: 'Custom playbook preview + agent drafts.', benefits: 'Tailored automation, safely.', preset: 'custom' },
];

function features() { return FEATURES; }
function useCases() { return USE_CASES; }
function findUseCase(key) { return USE_CASES.find((u) => u.key === key) || null; }

module.exports = { features, useCases, findUseCase, FEATURES, USE_CASES };
