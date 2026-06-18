# AI Tools Business System

Production-ready WhatsApp automation and admin dashboard for AI tools subscription resellers in Pakistan. It combines a Baileys multi-device bot, WA Sender group broadcasting fallback, dealer intelligence, encrypted stock tracking, JazzCash/EasyPaisa/Bank email payment parsing, Google Sheets sync, Bull/Redis payment jobs, n8n automation, and a Next.js dashboard.

## Quick Start

1. Clone the repo.
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
3. Fill all values in `.env`, especially `DB_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_NUMBER`, `ADMIN_AUTH_PASSWORD`, payment numbers, email parser settings, Google Sheets credentials, and group IDs.
4. Deploy:
   ```bash
   bash deploy.sh
   ```
5. Scan WhatsApp QR at:
   ```text
   http://localhost:3001/api/whatsapp/qr/customer-bot
   http://localhost:3001/api/whatsapp/qr/dealer-monitor
   http://localhost:3001/api/whatsapp/qr/admin-alerts
   ```
6. Open dashboard:
   ```text
   http://localhost:3000
   ```
7. Import n8n workflows from `n8n-workflows/` at:
   ```text
   http://localhost:5678
   ```

## Services

- Backend API: `http://localhost:3001`
- Frontend dashboard: `http://localhost:3000`
- Lovable/TanStack dashboard: `lovable-app/` via `npm run lovable:dev`
- n8n: `http://localhost:5678`
- Nginx reverse proxy: `http://localhost` and `https://localhost`
- PostgreSQL: internal Docker service `db`
- Redis: internal Docker service `redis`

## Lovable App

The Lovable-built dashboard is imported in `lovable-app/` as a separate TanStack/Vite app. It contains the richer composer, connections, publisher, channels, inbox, analytics, and scheduling UI.

Run it from the root:

```bash
npm run lovable:dev
```

Build it:

```bash
npm run lovable:build
```

Copy `lovable-app/.env.example` to `lovable-app/.env` locally and fill Supabase/Lovable values. Never commit real keys. The existing `server.js` remains the source of truth for local WhatsApp runtime, Baileys sessions, channel publisher sessions, and private automation workers.

## Payment Email Parser

The backend can watch Gmail/IMAP every 30 seconds and verify JazzCash, EasyPaisa, and bank notification emails.

```env
EMAIL_USER=your-gmail-or-imap-user
EMAIL_PASSWORD=your-app-password
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_PAYMENT_PARSER_ENABLED=true
PAYMENT_CHECK_INTERVAL_MS=30000
SENDER_NUMBER_VERIFICATION=false
JAZZCASH_MERCHANT_NUMBER=0300-0000000
EASYPAISA_MERCHANT_NUMBER=0321-0000000
BANK_ACCOUNT_NUMBER=MCB-0000000000
REDIS_URL=redis://redis:6379
```

Verification rules:

- Amount must match the pending order within `± Rs 5`.
- Transaction ID is SHA-256 hashed and can only be processed once.
- Payment must match an order created within the last 24 hours.
- Optional sender-number matching can be enabled with `SENDER_NUMBER_VERIFICATION=true`.
- Same sender paying 3+ times in one hour is flagged for manual review.
- If matched and stock exists, credentials are delivered automatically.

Payment API:

```text
POST /api/payments/parse-test
POST /api/payments/verify
POST /api/payments/manual-verify
GET  /api/payments/notifications
```

## WhatsApp Setup

Add the following values in `.env`:

```env
ADMIN_NUMBER=923001234567
SELLING_GROUPS=groupid1,groupid2
CUSTOMER_GROUPS=groupid3,groupid4
WA_CUSTOMER_SESSION=customer-bot
WA_DEALER_SESSION=dealer-monitor
WA_ADMIN_SESSION=admin-alerts
WA_AUTO_CONNECT=true
WA_SENDER_API_URL=
WA_SENDER_API_KEY=
```

Use the customer session for customer sales, dealer session for rate monitoring, and admin session for alerts. If WA Sender API credentials are available, group broadcasts use WA Sender. If not, the system falls back to Baileys and sends group-by-group with a 2 second delay.

`WA_AUTO_CONNECT=true` reconnects the saved WhatsApp session automatically after a server restart, so customers still receive menu/welcome replies without pressing Connect again.

## WhatsApp Automation Settings Center

SuperSender Pro now includes a reusable automation-settings layer that can be sold to other businesses and founders, not only AI tools resellers.

Dashboard:

```text
http://localhost:3001/wa-automation-settings
```

API:

```text
GET  /api/wa/automation-settings
POST /api/wa/automation-settings
POST /api/wa/automation-settings/preset
POST /api/wa/automation-settings/test-reply
GET  /api/wa/automation-settings/client-pack
POST /api/wa/automation-settings/client-pack
```

WhatsApp admin commands:

```text
!waauto
!waauto on
!waauto off
!waauto preset ecommerce_store
!waauto test price kya hai
!waauto pack founder_growth Client Name
```

Business presets:

- `ai_tools_reseller` - pricing, availability, orders, warranty, renewals, dealer rates.
- `founder_growth` - lead capture, demo booking, founder/client follow-ups.
- `ecommerce_store` - product questions, cart recovery, COD confirmation, tracking, stock alerts.
- `education_admissions` - admissions FAQ, eligibility, forms, documents, deadline reminders.
- `real_estate` - budget/location qualification, property media, visit scheduling.
- `support_center` - ticket triage, SLA alerts, issue routing, feedback recovery.

Safe defaults are enabled: structured task-bot mode, explicit opt-in, promotional caps, unsubscribe footer, dry-run live actions, and human handoff keywords.

The Client Pack Generator on the same page creates a sellable proposal for any preset. It includes the client pitch, setup checklist, demo WhatsApp replies, suggested setup/monthly pricing, API references, and safe operating rules. Generated packs are saved in runtime data as `waAutomationClientPacks.json` and should not be committed.

## Auto Stock Sourcing

When a customer asks for an AI tool/account type that has zero stock, the bot now starts a live sourcing request instead of losing the sale.

```env
AUTO_STOCK_SOURCING_ENABLED=true
AUTO_STOCK_SOURCING_GROUPS=groupid1,groupid2
AUTO_STOCK_SOURCING_TIMEOUT_MINUTES=120
```

Flow:

1. Customer asks for a tool and selected stock is unavailable.
2. Bot replies with a `Please wait` message and creates a request code such as `SRC-260508-ABCD`.
3. Bot posts the stock request into allowed dealer groups.
4. Dealer replies with `AVAILABLE SRC-...`, price, warranty, and delivery details.
5. Bot contacts the dealer privately, prepares a draft, and sends it to admin WhatsApp.
6. Admin replies `YES SRC-...` to approve or `NO SRC-...` to reject.
7. On approval, stock is reserved, customer is notified, and dealer is asked to reserve the account.

API:

```text
GET  /api/stock-sourcing
POST /api/stock-sourcing
POST /api/stock-sourcing/:code/approve
POST /api/stock-sourcing/:code/reject
```

## Scraping Agent Hub

The uploaded `data-scraping-agent.zip` has been imported as a blueprint pack instead of a separate app. SuperSender now exposes a built-in Scraping Agent Hub:

```text
http://localhost:3001/scraping-agent-hub
GET  /api/scraping-agent/status
GET  /api/scraping-agent/blueprints
GET  /api/scraping-agent/prompt
GET  /api/scraping-agent/jobs
POST /api/scraping-agent/extract
POST /api/scraping-agent/jobs
POST /api/scraping-agent/jobs/:id/run
```

Supported uses:

- Fetch any public website URL and extract title, description, headings, links, emails, phone numbers, prices, dates, WhatsApp links, and keywords.
- Search current web data through Tavily when `TAVILY_API_KEY` is configured.
- Create WhatsApp-ready drafts for scholarship updates, ecommerce products, AI tool deals, competitor prices, and social/channel content.
- Store the last 1000 extraction jobs in `data/scrapingAgentJobs.json`.
- Use public repo blueprints safely from Firecrawl, Crawlee, Browser Use, n8n, Postiz, Chatwoot, BullMQ, Uptime Kuma, LangGraph, and CrewAI without copying their code blindly.

Example:

```bash
curl -X POST http://localhost:3001/api/scraping-agent/jobs \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\",\"target\":\"product_import\"}"
```

The AI Automation Hub also includes `data-scraping-agent` as a configured imported blueprint:

```text
http://localhost:3001/ai-automation-hub
```

## Agentic Agent Registry

SuperSender Pro now has a future-proof Agentic Agent Registry. This lets you add current and upcoming AI agent frameworks without rewriting the main WhatsApp, ecommerce, social, or channel automation code.

Built-in blueprints:

- OpenClaw (`openclaw/openclaw`) for self-hosted personal/operator automation.
- Hermes Agent (`NousResearch/hermes-agent`) for long-running memory and self-improving agent loops.
- Hermes Agent Self-Evolution for prompt/skill improvement research.
- OpenHands for internal developer-agent/build-agent automation.
- Awesome OpenClaw Agents for future agent persona templates.
- CrewAI, LangGraph, Browser Use, n8n, MCP, and Agentic Inbox remain in the main AI Automation Hub.

Main APIs:

```text
GET  /api/ai-automation/status
GET  /api/ai-automation/repos
GET  /api/ai-automation/repo-catalog
POST /api/ai-automation/repo-plan
POST /api/ai-automation/repo-import
GET  /api/ai-automation/repo-catalog-prompt
GET  /api/ai-algorithms/catalog
GET  /api/ai-algorithms/status
POST /api/ai-algorithms/recommend
POST /api/ai-algorithms/run
GET  /api/ai-algorithms/prompt
GET  /api/ai-automation/agent-registry
POST /api/ai-automation/agent-registry
POST /api/ai-automation/agent-task-plan
GET  /api/ai-automation/agent-prompt
GET  /api/ai-automation/skills
POST /api/ai-automation/skills/install
POST /api/ai-automation/playbook
GET  /api/ai-automation/missions
POST /api/ai-automation/missions
PATCH /api/ai-automation/missions/:id
POST /api/ai-automation/missions/:id/run
POST /api/ai-automation/run-task
```

Dashboard:

```text
http://localhost:3001/ai-automation-hub
```

Useful env keys:

```text
OPENCLAW_GATEWAY_URL=
OPENCLAW_API_KEY=
HERMES_AGENT_URL=
HERMES_AGENT_API_KEY=
HERMES_EVOLUTION_WORKER_URL=
OPENHANDS_WORKER_URL=
OPENHANDS_API_KEY=
AGENTIC_AGENT_WEBHOOK_URL=
AGENTIC_SKILLS_ENABLED=true
AGENTIC_SKILLS_DRY_RUN_DEFAULT=true
AGENTIC_MISSIONS_ENABLED=true
AGENTIC_MISSIONS_REQUIRE_APPROVAL=true
AGENTIC_REPO_IMPORTS_ENABLED=true
AGENTIC_REPO_IMPORT_DRY_RUN_DEFAULT=true
AGENTIC_REPO_ALLOW_VENDOR_COPY=false
AI_ALGORITHMS_ENABLED=true
AI_ALGORITHMS_DRY_RUN_DEFAULT=true
```

Built-in Agentic Skill Packs:

- Ecommerce Autopilot: order sync, abandoned cart, COD confirmation, stock alerts.
- Channel Publisher Copilot: source-channel watching, branding, filtering, fallback manual packets.
- Scholarship Scout: website/source scraping, deadline detection, WhatsApp/social post drafts.
- Dealer Intelligence Agent: dealer rate parsing, trust scoring, margin recommendation.
- Payment Verifier: email/TXN/screenshot payment signal review and fraud guard.
- Support Recovery Agent: customer memory, issue recovery, warranty-safe support replies.
- Social Growth Engine: captions, social calendar, UTM/click tracking, content repurposing.
- Developer Maintainer: health checks, diagnostics, safe patch planning, repo maintenance.

To generate a workflow from a business goal:

```bash
curl -X POST http://localhost:3001/api/ai-automation/playbook \
  -H "Content-Type: application/json" \
  -d "{\"goal\":\"automate ecommerce and channel posting\",\"channels\":\"whatsapp,facebook,website\"}"
```

To install a pack in dry-run mode:

```bash
curl -X POST http://localhost:3001/api/ai-automation/skills/install \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"ecommerce-autopilot\",\"source\":\"admin\"}"
```

Automation Missions:

Missions turn a business goal into a saved, auditable dry-run workflow. They do not send live WhatsApp, social, payment, or ecommerce actions by default.

```bash
curl -X POST http://localhost:3001/api/ai-automation/missions \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Daily Growth Mission\",\"goal\":\"recover ecommerce carts and post best channel offers\",\"channels\":\"whatsapp,facebook,website\"}"
```

Run mission dry-run:

```bash
curl -X POST http://localhost:3001/api/ai-automation/missions/MISSION_ID/run \
  -H "Content-Type: application/json" \
  -d "{\"dryRun\":true,\"source\":\"admin\"}"
```

Public Repo Import Center:

SuperSender Pro includes a safe public repo catalog for agentic AI, ecommerce, social scheduling, scraping, monitoring, support inboxes, MCP, and browser automation. Repos are used as blueprints/adapters first. The system queues integration plans and dry-runs instead of blindly copying third-party code into production.

Included catalog examples:

- OpenHands, Hermes Agent, OpenClaw, CrewAI, LangGraph, Browser Use, n8n.
- OpenAI Agents JS/Python, AutoGen, Agent Browser, Bytebot, Crawlee, Firecrawl.
- Composio, MCP Servers, Awesome MCP Servers, PraisonAI, SuperAGI, AutoGPT, AgentGPT.
- Chatwoot, Postiz, Langfuse, Opik, Helicone, Uptime Kuma, Flowise, Langflow, Dify.

Useful API calls:

```bash
curl http://localhost:3001/api/ai-automation/repo-catalog

curl -X POST http://localhost:3001/api/ai-automation/repo-plan \
  -H "Content-Type: application/json" \
  -d "{\"repo\":\"crewai\",\"goal\":\"Build ecommerce automation agents\"}"

curl -X POST http://localhost:3001/api/ai-automation/repo-import \
  -H "Content-Type: application/json" \
  -d "{\"repo\":\"firecrawl\",\"dryRun\":true,\"source\":\"admin\"}"
```

AI Algorithms Engine:

The project now includes a June 2026-ready AI Algorithm Strategy Engine. It does not pretend that one model solves everything; it maps the right algorithm family to the right SuperSender module.

Included algorithm families:

- Intent routing, state repair, contextual memory RAG, hybrid retrieval, grounding checks.
- Durable graph orchestration, agent handoff supervision, MCP tool routing, queue priority optimization.
- Dealer ranking, dynamic pricing, price spread arbitrage, lead scoring, churn prediction, next-best-offer recommendations.
- Fraud anomaly detection, PII/secret redaction, content safety moderation, semantic dedupe, viral prediction.
- OCR, voice transcript intent parsing, product extraction, caption generation, website-change summarization.
- Prompt optimization, A/B uplift testing, send-time optimization, business KPI advisor.

Dashboard:

```text
http://localhost:3001/ai-algorithms
```

Useful API calls:

```bash
curl http://localhost:3001/api/ai-algorithms/catalog

curl -X POST http://localhost:3001/api/ai-algorithms/recommend \
  -H "Content-Type: application/json" \
  -d "{\"goal\":\"make WhatsApp sales bot smarter\",\"module\":\"whatsapp-bot\"}"

curl -X POST http://localhost:3001/api/ai-algorithms/run \
  -H "Content-Type: application/json" \
  -d "{\"algorithm\":\"intent-ensemble-router\",\"dryRun\":true,\"source\":\"admin\"}"
```

Safe operating rules:

- Do not send `.env`, WhatsApp sessions, customer logs, or API tokens to external agents.
- Keep every live-posting/payment/WhatsApp action in dry-run until admin approves it.
- Use `/api/ai-automation/agent-task-plan` before wiring a new agent so the system records safety steps and missing env keys.
- Custom agents are stored in `data/agenticAgentRegistry.json`; this runtime file should not be committed.
- Public repo import queue is stored in `data/agenticRepoImportQueue.json`; this runtime file should not be committed.
- AI algorithm dry-runs are stored in `data/aiAlgorithmRuns.json`; this runtime file should not be committed.

## Facebook, Instagram, and LinkedIn Setup

The system has a Social dashboard at:

```text
http://localhost:3000/social
```

One-click OAuth connection is now supported from the Social dashboard.

Setup once:

1. Create a Meta Developer app and add `FACEBOOK_APP_ID` plus `FACEBOOK_APP_SECRET`.
2. In Meta app settings, add these OAuth redirect URIs:
   - `https://your-domain.com/api/social/oauth/facebook/callback`
   - `https://your-domain.com/api/social/oauth/instagram/callback`
3. Create a LinkedIn developer app and add `LINKEDIN_CLIENT_ID` plus `LINKEDIN_CLIENT_SECRET`.
4. In LinkedIn app settings, add:
   - `https://your-domain.com/api/social/oauth/linkedin/callback`
5. Open Social Hub and click `Connect` on Facebook, Instagram, or LinkedIn.
6. User logs in, allows permissions, and the backend automatically stores Page IDs, Instagram Business IDs, LinkedIn author URNs, and access tokens.

Add credentials later in the dashboard or directly in `.env`:

```env
META_GRAPH_VERSION=v21.0
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_PAGE_ID=
FB_PAGE_ACCESS_TOKEN=
FB_VERIFY_TOKEN=
INSTAGRAM_PAGE_ID=
INSTAGRAM_IG_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_AUTHOR_URN=
```

Backend endpoints:

```text
GET  /api/social/status
GET  /api/social/accounts
POST /api/social/accounts
POST /api/social/test/:platform
POST /api/social/publish
GET  /api/social/posts
GET  /api/social/events
GET  /api/social/comments
GET  /api/social/oauth/urls
POST /api/social/comment
POST /webhook/social/:platform
GET  /webhook/meta
POST /webhook/meta
```

Facebook publishing uses the Page feed/photos/videos API. Instagram publishing uses the Business media container then publish flow and supports `imageUrl` or `videoUrl` reels. LinkedIn publishing uses `ugcPosts` with `LINKEDIN_AUTHOR_URN`; for generated videos it posts the caption plus the video link unless native LinkedIn video upload is added later.
Comments/replies are available from Social Hub:

- Facebook: target post/comment ID uses `/{id}/comments`
- Instagram: media comments use `/{media-id}/comments`, comment replies use `/{comment-id}/replies`
- LinkedIn: target post URN uses `/v2/socialActions/{urn}/comments`

Until valid tokens and IDs are added, the system safely reports `Token needed` and stores blocked publish attempts instead of crashing.

## Ecommerce Integration Hub

Open:

```text
http://localhost:3001/ecommerce-hub
```

This hub connects external stores to the same WhatsApp product catalog, order list, admin alerts, and abandoned-cart automation used by SuperSender Pro.

Supported connector profiles:

- Shopify
- WooCommerce
- Magento / Adobe Commerce
- BigCommerce
- Ecwid
- OpenCart
- Wix Stores
- Squarespace Commerce
- Daraz Seller Center via feed/API bridge
- Dukaan via feed/API bridge
- Amazon Seller / SP-API via bridge
- eBay via OAuth/feed bridge
- Etsy via OAuth/feed bridge
- Lazada via seller bridge
- AliExpress/dropshipping feeds
- SHOPLINE
- Shopware
- commercetools
- Square Online
- Lightspeed
- Odoo Ecommerce
- Zoho Commerce
- WhatsApp Catalog / Manual Store
- Custom website/API JSON feed

Main APIs:

```text
GET    /api/ecommerce/status
GET    /api/ecommerce/platforms
GET    /api/ecommerce/features
POST   /api/ecommerce/automation-plan
GET    /api/ecommerce/repo-blueprints
GET    /api/ecommerce/repo-blueprints/:slug/prompt
GET    /api/ecommerce/repo-blueprints-prompt
GET    /api/ecommerce/automation-recipes
POST   /api/ecommerce/automation-recipes/:id/draft
POST   /api/ecommerce/automation-recipes/:id/send
GET    /api/ecommerce/connections
POST   /api/ecommerce/connections
PUT    /api/ecommerce/connections/:id
DELETE /api/ecommerce/connections/:id
POST   /api/ecommerce/connections/:id/test
POST   /api/ecommerce/connections/:id/sync-products
POST   /api/ecommerce/connections/:id/sync-orders
POST   /api/ecommerce/sync-all
POST   /api/ecommerce/webhook/:platform/:connectionId?
```

Built-in open-source repo blueprints:

- Medusa: headless commerce backend pattern
- Saleor: GraphQL commerce/channel pattern
- Vendure: TypeScript plugin architecture pattern
- Spree/Solidus: mature order/payment/stock lifecycle patterns
- Bagisto: marketplace/vendor concepts for dealer intelligence
- Sylius: state-machine/workflow pattern
- PrestaShop/WooCommerce: legacy store connector targets
- Reaction Commerce: event-driven marketplace concepts
- Magento Open Source, Shopware, nopCommerce, Odoo, ERPNext, Aimeos, Broadleaf: enterprise/ERP/plugin patterns

These are used as implementation blueprints and connector patterns, not copied blindly into the codebase.

Automation recipes included:

- COD confirmation
- Abandoned cart recovery
- Back-in-stock alert
- Low-stock urgency
- Review request
- Smart cross-sell
- Proactive delay notification
- Price-drop campaign
- Payment pending recovery
- Failed payment support
- Refund/return update
- VIP loyalty offer
- Reorder reminder
- Bundle builder

How it works:

1. Add a store connection from `/ecommerce-hub`.
2. Paste the store URL plus token/consumer keys, or provide a product/order JSON feed.
3. Click `Sync Products` to import products into the WhatsApp catalog data.
4. Click `Sync Orders` or connect webhooks to create/update orders automatically.
5. Existing WhatsApp order notifications, admin alerts, abandoned cart reminders, and commerce events continue to work.

For platforms with complex signing such as Daraz, use a lightweight n8n/custom bridge that outputs JSON to:

```text
POST /api/ecommerce/webhook/daraz
```

Product feed format can be either an array or:

```json
{
  "products": [
    {
      "id": "SKU-1",
      "name": "Product name",
      "price": 2500,
      "image": "https://example.com/product.jpg",
      "url": "https://example.com/product"
    }
  ]
}
```

Order webhook format can be either the native platform payload or:

```json
{
  "order": {
    "id": "1001",
    "customer_name": "Ali",
    "phone": "03001234567",
    "total": 2500,
    "items": [{ "name": "Product", "quantity": 1, "price": 2500 }]
  }
}
```

## Social Auto Poster

Place social post files in:

```text
social-auto-posts/inbox
```

The backend scans the folder every 60 seconds and processes `.json`, `.txt`, and `.md` files. Files move through:

```text
social-auto-posts/inbox   -> new files
social-auto-posts/queued  -> imported jobs
social-auto-posts/posted  -> successfully processed jobs
social-auto-posts/failed  -> invalid or permanently failed jobs
```

TXT/MD format:

```text
platforms: facebook, instagram, linkedin
image: offer.jpg
scheduledAt: 2026-05-08T20:00:00+05:00
---
Aaj ke AI tools plans available hain.
DM for rates.
```

JSON format:

```json
{
  "platforms": ["facebook", "instagram", "linkedin"],
  "message": "Aaj ke AI tools plans available hain. DM for rates.",
  "image": "offer.jpg",
  "scheduledAt": "2026-05-08T20:00:00+05:00"
}
```

Manual controls are available in the Social Hub and via API:

```text
GET  /api/social/auto-poster/status
POST /api/social/auto-poster/scan
POST /api/social/auto-poster/run
GET  /api/social/auto-poster/jobs
```

Instagram requires an image. Facebook and LinkedIn can publish text-only posts. You can put a matching local image beside the post file, for example `eid-offer.txt` plus `eid-offer.jpg`; the system copies it to `social-auto-posts/media` and serves it through `/social-auto-media/...`. For production Meta/Instagram posting, set `SOCIAL_PUBLIC_BASE_URL` to your public HTTPS domain so Meta can fetch the media.

## AI Video Agent

The Social Hub now includes an AI Video Agent. You can add 3-5 AI video generation providers later from the dashboard or `.env`, then drop prompt files into:

```text
video-auto-posts/inbox
```

The agent scans the folder every 120 seconds, sends the prompt to the configured provider, saves the returned `videoUrl`, and posts it to connected Facebook, Instagram, and LinkedIn accounts.
You can also create video jobs manually in the Social Hub by entering title, prompt, caption, platforms, optional existing video URL, reference image URL, duration, aspect ratio, and schedule time.

TXT/MD video job format:

```text
provider: auto
platforms: facebook, instagram, linkedin
durationSeconds: 8
aspectRatio: 9:16
message: AI Tools Store update. DM for today rates.
---
Create a vertical promo video for ChatGPT Plus, Claude Pro, Cursor Pro, Gemini Advanced.
```

JSON video job format:

```json
{
  "provider": "auto",
  "platforms": ["facebook", "instagram", "linkedin"],
  "prompt": "Create a short vertical AI tools promo video.",
  "message": "AI Tools Store update. DM for today rates.",
  "durationSeconds": 8,
  "aspectRatio": "9:16"
}
```

Provider environment slots:

```env
VIDEO_AGENT_ENABLED=true
VIDEO_AUTO_POST_DIR=video-auto-posts
VIDEO_AUTO_POST_INTERVAL_SECONDS=120
VIDEO_PUBLIC_BASE_URL=https://your-domain.com
VIDEO_PROVIDER_1_NAME=
VIDEO_PROVIDER_1_API_URL=
VIDEO_PROVIDER_1_API_KEY=
VIDEO_PROVIDER_1_RESULT_PATH=data.video_url
VIDEO_PROVIDER_1_STATUS_URL=
```

Repeat provider slots 1-5 as needed. If a provider returns the video URL in a custom JSON path, set `VIDEO_PROVIDER_X_RESULT_PATH`, for example `video_url`, `data.output[0]`, or `result.videoUrl`.

Manual API controls:

```text
GET  /api/video-agent/status
GET  /api/video-agent/providers
POST /api/video-agent/providers
GET  /api/video-agent/jobs
POST /api/video-agent/jobs
POST /api/video-agent/scan
POST /api/video-agent/run
POST /api/video-agent/jobs/:id/retry
DELETE /api/video-agent/jobs/:id
```

For production video posting, set `VIDEO_PUBLIC_BASE_URL` to a public HTTPS domain so Meta/Instagram can fetch generated videos from `/video-auto-generated/...`.

## Moclaw AI Giveaway

The customer bot and plan manager include a giveaway option:

- Trigger words: `giveaway`, `free trial`, `moclaw`, `deepseek`, `6`
- Offer: DeepSeek V4 Pro free for 30 days
- Includes: 1,000 credits
- Terms: DeepSeek V4 only, no card required
- Claim link: `https://moclaw.ai`

The bot sends both the giveaway image and the plan/claim steps. The image asset is stored at:

```text
public/assets/giveaways/moclaw-deepseek-v4-free-trial.png
backend/assets/giveaways/moclaw-deepseek-v4-free-trial.png
frontend/public/assets/giveaways/moclaw-deepseek-v4-free-trial.png
```

## Google Sheets Setup

Create a Google Cloud service account, share the sheet with its email, then add:

```env
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

The sync writes six sheets:

- Daily Rates
- Purchases
- Sales
- P&L Summary
- Dealers
- Stock Status

Automatic sync runs daily at 11 PM. Admin can trigger it manually with `!sync`.

## Zero-Touch Order Engine

The backend now includes an autopilot layer for renewals, smart pricing, payment recovery, upsells, and review requests. It uses Bull.js + Redis when available and falls back to inline execution if Bull is not installed.

Daily schedule in Pakistan time:

- 8:00 AM: expiry reminders for accounts ending in 7, 3, or 1 day
- 10:00 AM: low-stock and dealer-price refresh before daily rates broadcast
- 12:00 PM: pending payment recovery, smart upsells, lost customer recovery, review requests
- 6:00 PM: segmented evening deals for opted-in existing customers
- 9:00 PM: Urdu admin report with sales, revenue, stock, and next-day suggestions
- 11:00 PM: Sheets sync, local SQLite backup when applicable, and tomorrow task planning

Admin commands:

```text
!autopilot
!autopilot expiry_reminders
!autopilot pending_payment_recovery
!autopilot segmented_evening_deals
!autopilotstatus
!memory 923001234567
```

API:

```text
GET  /api/zero-touch/summary
GET  /api/zero-touch/customer/:phone
GET  /api/zero-touch/dynamic-availability
GET  /api/zero-touch/pricing-recommendations
POST /api/zero-touch/run/:job
```

Dashboard page:

```text
http://localhost:3000/zero-touch
```

Customer memory tracks purchase history, communication style, preferred payment method, preferred tools, tier (`Bronze`, `Silver`, `Gold`, `VIP`), and promotion frequency. Promotional WhatsApp sends are capped at two per customer per week.

## Admin Commands

Send these from `ADMIN_NUMBER` in private chat or any group:

```text
!auth password
!verify TXN_ID [ORDERID]
!deliver ORDERID
!approve ORDERID
!reject ORDERID reason
!replace ORDERID
!resolve ORDERID solution
!stock
!addkey tool type dealerCode email:pass
!pricing tool type price
!orders
!sales
!scam number reason
!scammer number reason
!broadcast message
!addgroup GROUP_ID CUSTOMER|DEALER name
!removegroup GROUP_ID
!stats
!rates
!profit tool buy sell
!trust number
!untrust number
!pending
!sync
!help
```

Unauthorized command attempts are logged to admin alerts.

If `ADMIN_AUTH_PASSWORD` is set, admin commands require `!auth password` first. Auth lasts 12 hours per WhatsApp admin number.

## Security

- Stock credentials are encrypted with AES-256-GCM before database storage.
- Transaction IDs are hashed before being attached to orders.
- API routes are rate-limited when `express-rate-limit` is installed.
- Every delivery writes an audit log.
- Scammer flags block and alert suspicious customers/dealers.

## Bot Commands for Customers

Customers can send:

```text
hi
price
rates
stock
available
order ChatGPT Plus
help
menu
cancel
واپس
```

Conversation state resets after 30 minutes of inactivity or immediately with `menu`, `cancel`, or `واپس`.

## Dealer Intelligence

Dealer groups in `SELLING_GROUPS` are monitored for rate messages. The parser supports one-line, multiline, comma-separated, pipe-separated, dash-separated, and Urdu/English mixed messages such as:

```text
aaj ka rate:
chatgpt 1800
claude 1650
cursor 2100
```

Unverified dealers trigger a trust vote. Three `TRUSTED YES` votes create a D-code. Three `TRUSTED NO` votes flag the number as suspected scammer.

## Deployment Notes

The production Docker build uses PostgreSQL. The source Prisma schema remains SQLite-friendly for local development; the backend Dockerfile creates `src/prisma/schema.docker.prisma` and switches the provider to PostgreSQL during build.

For external audits or manual database bootstrap, a PostgreSQL reference schema is included at:

```text
backend/src/database/schema.sql
```

For real SSL, replace:

```text
ssl/fullchain.pem
ssl/privkey.pem
```

with certificates from your domain provider or LetsEncrypt.

## Useful Commands

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f n8n
docker exec backend npx prisma studio --schema src/prisma/schema.docker.prisma
docker exec backend node src/db/seed.js
```

## Health Check

Backend:

```text
GET http://localhost:3001/api/health
```

Frontend:

```text
http://localhost:3000
```
