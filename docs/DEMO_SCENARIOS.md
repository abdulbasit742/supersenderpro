# Demo Scenarios

Ten guided scenarios. Each loads fake data (dry-run), returns guided tour steps and recommends pages to open.
Starting a scenario **never** mutates real module data and **never** calls external APIs.

| # | ID | Title | Modules used |
|---|---|---|---|
| 1 | `ai_tools_reseller` | AI Tools Reseller Demo | business, customers, orders, payments, whatsapp, kpi |
| 2 | `ecommerce_store` | Ecommerce Store Demo | business, ecommerce, orders, payments, kpi |
| 3 | `whatsapp_channel_automation` | WhatsApp Channel Automation Demo | whatsapp, channelAutomation, kpi |
| 4 | `customer_360_support` | Customer 360 Support Demo | customers, orders, payments, whatsapp |
| 5 | `voice_ai_reply` | Voice AI Reply Demo | voiceAI, customers |
| 6 | `marketplace_seller_buyer` | Marketplace Seller/Buyer Demo | marketplace, ecommerce, kpi |
| 7 | `growth_campaign` | Growth Campaign Demo | customers, growthCampaign, kpi |
| 8 | `saas_billing` | SaaS Billing Demo | saasBilling, kpi |
| 9 | `owner_daily_briefing` | Owner Daily Briefing Demo | kpi, customers, orders |
| 10 | `incident_recovery` | Incident Recovery Demo | kpi, channelAutomation |

### Scenario shape
```js
{ id, title, description, modulesUsed, sampleData, tourSteps, expectedOutcome, dryRun, createdAt }
```

### Start a scenario
```
POST /api/demo-sandbox/scenarios/ai_tools_reseller/start
→ { ok, demo, dryRun, scenario, data, tourSteps, tourId, recommendedPages }
```
