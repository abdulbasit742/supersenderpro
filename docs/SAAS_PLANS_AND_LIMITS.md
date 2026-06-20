# SaaS Plans & Limits

Plans live in `lib/saasBilling/planRegistry.js` and are seeded into `data/saas-billing.json`
on first read (the data file is gitignored — no customer data is committed).

## Plan model
```
{ id, name, tier, price, currency, billingCycle, features, limits, trialDays, isActive, createdAt, updatedAt }
```

## Default tiers
`free_trial · starter · growth · pro · agency · reseller · enterprise · lifetime · custom`

| Plan | Price (PKR) | Cycle | Trial | Notes |
|---|---|---|---|---|
| free_trial | 0 | trial | 14d | Core features, tiny limits |
| starter | 2,000 | monthly | 7d | Small business |
| growth | 5,000 | monthly | 7d | + ecommerce, customer 360, flow studio |
| pro | 12,000 | monthly | 7d | + voice AI, marketplace, API, owner command |
| agency | 30,000 | monthly | 7d | All features, large limits |
| reseller | 50,000 | monthly | — | All features, reseller-scale limits |
| enterprise | custom | custom | — | Unlimited (sales-assisted) |
| lifetime | 150,000 | lifetime | — | Unlimited, one-time |
| custom | 0 | custom | — | Blank template |

> Enterprise/custom are **sales-assisted** and are excluded from automatic upgrade suggestions.

## Limit keys
`whatsappAccounts, whatsappChannels, connectedSocialAccounts, ecommerceStores, aiAgents,
voiceMinutes, ttsCharacters, sttMinutes, channelPostsPerDay, socialPostsPerDay,
customer360Profiles, marketplaceItems, flowRunsPerMonth, automationRules, teamMembers,
storageMb, apiCallsPerMonth` — `-1` means unlimited.

## Feature gates
`whatsapp_bot, whatsapp_cloud, channel_automation, social_bridge, ecommerce_hub, customer_360,
voice_ai, marketplace_intelligence, group_commerce, ai_agent_deployment, owner_command,
playbook_builder, business_setup, flow_studio, analytics_reports, google_sheets, n8n_bridge,
api_access, white_label, reseller_portal, priority_support`

## Managing plans (API)
- `GET /api/saas-billing/plans` · `GET /plans/:id`
- `POST /plans` · `PUT /plans/:id` · `DELETE /plans/:id` (soft-deactivate)

Plan writes require admin auth **and** `SAAS_BILLING_ALLOW_PLAN_WRITE=true`. Deletes never
hard-remove a plan — they set `isActive=false`.
