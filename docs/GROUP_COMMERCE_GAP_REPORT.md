# Group Commerce OS Gap Report & Feature Inventory

This document summarizes the existing features found during scanning and outlines what needs to be added for Group Commerce OS.

## Feature Inventory Scan Results

| Feature | Status | Duplicate Risk | Matching Files in Repo |
| --- | --- | --- | --- |
| WhatsApp group management | **exists** | high (do not duplicate!) | `automations/groupAnalytics.js`<br>`automations/groupAutoReply.js`<br>`automations/groupBroadcast.js`<br>`backend/src/whatsapp/groupManager.js` |
| WhatsApp/Baileys bot | **exists** | high (do not duplicate!) | `backend/src/whatsapp/baileysClient.js`<br>`wa-sales-bot/.env.example`<br>`wa-sales-bot/README.md`<br>`wa-sales-bot/apiServer.js`<br>`wa-sales-bot/bot/admin/commands.js`<br>...and 43 more |
| WhatsApp Cloud API | **missing** | low | None |
| WhatsApp channel automation | **partially_exists** | high (do not duplicate!) | `automations/channelForwarder.js`<br>`scripts/export-channels.js` |
| ecommerce hub | **partially_exists** | high (do not duplicate!) | `bots/storeBot.js`<br>`docs/ecommerce-platform-completion.md`<br>`lovable-app/src/lib/marketplace.functions.ts`<br>`lovable-app/src/routes/_app.commerce.tsx`<br>`public/assets/brand-icons/woocommerce.svg`<br>...and 1 more |
| product catalog | **exists** | high (do not duplicate!) | `backend/src/config/catalog.js`<br>`lovable-app/src/routes/_app.catalog.tsx` |
| orders | **exists** | high (do not duplicate!) | `automations/orderConfirmation.js`<br>`backend/src/bot/flows/order.js`<br>`frontend/app/orders/page.js`<br>`lovable-app/src/routes/_app.orders.tsx`<br>`wa-sales-bot/bot/flows/order.js` |
| payments | **exists** | high (do not duplicate!) | `backend/src/payment/easypaisa.js`<br>`backend/src/payment/jazzcash.js`<br>`backend/src/payment/verifier.js`<br>`backend/src/queues/paymentQueue.js`<br>`backend/src/routes/payments.js` |
| CRM/customers | **exists** | high (do not duplicate!) | `backend/src/routes/customers.js`<br>`lib/kommoCRM.js`<br>`routes/kommo.js` |
| dealer intelligence | **exists** | high (do not duplicate!) | `backend/src/dealerIntelligence/dealerAccess.js`<br>`backend/src/dealerIntelligence/dealerParser.js`<br>`backend/src/dealerIntelligence/groupMonitor.js`<br>`backend/src/dealerIntelligence/priceAnalytics.js`<br>`backend/src/dealerIntelligence/stockManager.js`<br>...and 8 more |
| seller/rate/stock parsing | **exists** | high (do not duplicate!) | `backend/src/bot/flows/rates.js`<br>`backend/src/routes/rates.js`<br>`backend/src/services/stockService.js`<br>`backend/src/utils/rateParser.js`<br>`wa-sales-bot/bot/flows/rates.js`<br>...and 1 more |
| AI agents | **exists** | high (do not duplicate!) | `ai/agents/selfHealingAgent.js`<br>`ai/aiBrain.js`<br>`ai/aiManager.js`<br>`backend/src/aiAgent/classifier.js`<br>`backend/src/aiAgent/escalation.js`<br>...and 3 more |
| flow builder / automation builder | **exists** | high (do not duplicate!) | `backend/src/zeroTouch/engine.js`<br>`backend/src/zeroTouch/index.js`<br>`backend/src/zeroTouch/memory.js`<br>`backend/src/zeroTouch/pricing.js`<br>`backend/src/zeroTouch/queue.js`<br>...and 3 more |
| social hub | **partially_exists** | high (do not duplicate!) | `integrations/socialHub.js`<br>`lovable-app/src/routes/_app.channels.tsx`<br>`social-auto-posts/README.md`<br>`social-auto-posts/examples/daily-ai-tools-post.json`<br>`social-auto-posts/examples/text-post-template.txt`<br>...and 1 more |
| n8n bridge | **exists** | high (do not duplicate!) | `backend/src/routes/n8n.js`<br>`backend/src/services/n8nClient.js`<br>`integrations/n8nBridge.js`<br>`n8n-workflows/README.md`<br>`n8n-workflows/customer-followup.json`<br>...and 4 more |
| Google Sheets reporting | **exists** | high (do not duplicate!) | `backend/src/services/sheetsService.js`<br>`backend/src/utils/sheetsSync.js`<br>`lib/reportingConnectors.js` |
| admin auth/RBAC | **exists** | high (do not duplicate!) | `backend/src/middleware/auth.js`<br>`backend/src/routes/auth.js`<br>`lovable-app/src/routes/auth.tsx` |
| security scan | **exists** | high (do not duplicate!) | `backend/src/security/encryption.js`<br>`backend/src/security/fraudDetection.js`<br>`scripts/healthCheck.js` |
| launch center | **partially_exists** | high (do not duplicate!) | `docs/OFFICIAL_LAUNCH_CHECKLIST.md`<br>`scripts/go-live.ps1`<br>`scripts/launch-readiness.js` |
| local worker bridge | **partially_exists** | high (do not duplicate!) | `agent-runtime/README.md`<br>`agent-runtime/__tests__/sandbox.test.js`<br>`agent-runtime/agents.js`<br>`agent-runtime/approvalQueue.js`<br>`agent-runtime/contextSanitizer.js`<br>...and 13 more |
| any existing group moderation/admin command logic | **exists** | high (do not duplicate!) | `backend/src/bot/admin/commands.js`<br>`wa-sales-bot/bot/admin/commands.js` |

## Gap Analysis

### 1. Existing Systems Found
- **WhatsApp Bots & Clients:** We found standard Baileys implementations (`backend/src/whatsapp/baileysClient.js`, `wa-sales-bot/index.js`, `whatsapp-ai-tools-bot`). We must reuse or integrate with these rather than building another client.
- **Dealer Intelligence & Pricing:** We found extensive parser logic (`backend/src/utils/rateParser.js`), trust management (`backend/src/dealerIntelligence/trustManager.js`), and stock management (`backend/src/dealerIntelligence/stockManager.js`). Group Commerce OS should act as a high-level wrapper that utilizes these tools.
- **Admin Commands:** There are admin command routers in `wa-sales-bot/bot/admin/commands.js` and `backend/src/bot/admin/commands.js`. We will build a dedicated Group Commerce router `/api/group-commerce/groups/:id/command` and `lib/groupCommerce/commandRouter.js` to handle the specific marketplace commands.
- **Flow Builder:** A flow studio definition and zeroTouch engine are present (`backend/src/zeroTouch/engine.js`). We will create a small registry (`lib/groupCommerce/flowNodes.js`) representing Group Commerce triggers and actions for future visual integrations instead of rebuilding a visual canvas.
- **Ecommerce Hub:** A catalog configuration exists (`backend/src/config/catalog.js`, `lovable-app/src/routes/_app.catalog.tsx`). We will build `lib/groupCommerce/ecommerceBridge.js` to map/sync group activities to ecommerce drafts without replacing existing cart/order flows.

### 2. What Is Missing & To Be Built (The Group Commerce OS layer)
We will build the coordinate/moderation/intelligence layer specifically for Group Commerce OS, which includes:
- **Group Registry & Storage:** Storing settings per-group (commerceMode, aiAgentMode, relaySettings, etc.).
- **Command Router:** Routing commands like `/pause`, `/resume`, `/catalog`, `/sellers`, `/approve`, `/warn`.
- **Link & Moderation Engine:** Flagging banned links, repeated posts, or invalid sellers, with dry-run support.
- **Seller/Buyer/SKU Intelligence:** Formulating normalized extractions from natural text messages.
- **Group Catalog Management:** Managing a virtual catalog per group with trusted sellers, SKUs, prices.
- **Ecommerce & Social/Channel Bridges:** Drafting previews of synced orders, catalogs, and posts.
- **AI Agent Router:** Directing group messages to assigned AI roles (sales, support, moderation).
- **Pause Manager:** Temporary mute/pause controls (5-10m) per group.
- **API Routes & Web Dashboard UI:** Full REST API at `/api/group-commerce` and an interactive diagnostic/tester page at `/public/group-commerce.html`.
