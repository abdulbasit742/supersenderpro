# Marketplace Intelligence — Gap Report

Scan date: 2026-06-20 · Repo: `abdulbasit742/supersenderpro`

## What already exists (NOT rebuilt)
| Existing module | Where | Decision |
|---|---|---|
| Channel Automation Command Center | `lib/channelAutomationCenter.js`, `routes/channelAutomation.js` | **Reuse** via `channelAutomationAdapter` (consume logs only) |
| Ecommerce hub | `server.js` `/api/ecommerce/*`, `lib/store*`, `lib/productBotEngine.js` | **Reuse** via `ecommerceAdapter` (consume products/orders) |
| Dealer intelligence / seller rates | `server.js` `seller_rates.*`, `backend/src/dealerIntelligence`, `wa-sales-bot` | **Reuse** via `dealerAdapter` (consume parsed rows) |
| AI provider stack | `server.js` `callAIProvider()`, `ai/` | **Reuse** — live AI only when `MARKETPLACE_INTELLIGENCE_AI_LIVE=true` |
| Flow Studio | `server.js` `flow_studio_*` | **Reuse** — export `flowNodes.js` registry entries only |
| Admin command dispatcher | `server.js` `handleWhatsAppSocialAdminCommand` | **Reuse** — wired `!market*` commands in |
| JSON persistence pattern | `server.js` `loadJSON/saveJSON`, `data/*.json` (gitignored) | **Reuse** style in `store.js` |

## What was missing and built here
- Central seller/buyer/SKU/price/stock **entity graph** (`lib/marketplaceIntelligence/`)
- Seller trust scoring + ranking, buyer demand scoring + matching
- SKU resolver, price radar, stock radar, opportunity detector
- Rule-based (dry-run) recommendation engine + optional AI advisor
- Source ingestion **adapters** (group/chat/channel/ecommerce/social/dealer/order)
- REST API (`routes/marketplaceIntelligenceRoutes.js`)
- Admin dashboard page (`public/marketplace-intelligence.html` + js/css)
- WhatsApp admin commands, Flow Studio node registry, reports, docs, env placeholders, self-test script

## Duplicate-risk areas explicitly avoided
WhatsApp transport, ecommerce CRUD, channel publishing, social posting, payments, the LLM provider, and Flow Studio engine were **not** reimplemented. The marketplace layer only **reads** normalized, masked signals and **suggests** actions (dry-run).

See `artifacts/marketplace_intelligence_inventory.json` for the per-area status matrix.
