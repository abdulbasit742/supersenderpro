# SuperSender Pro - Full Project Report for Any LLM

Last scanned: 2026-06-20
Main repo path: `D:\SuperSenderPro\repo-ready-to-push\supersenderpro-update`
Live local app path: `D:\SuperSenderPro\supersender-pro-final`
Primary live server file: `server.js`
Primary dashboard file: `public/index.html`
GitHub repo: `https://github.com/abdulbasit742/supersenderpro`

## 1. Project Identity

SuperSender Pro is an AI Business Command Center for WhatsApp-led businesses. It combines WhatsApp automation, AI tool subscription resale, dealer intelligence, ecommerce integrations, social posting, WhatsApp channel automation, customer CRM, payment workflows, reports, agentic automation, MCP tools, and deployment assets.

The project is not a small single-purpose bot. It is closer to a business automation operating system for:

- AI tools reseller business
- WhatsApp sales automation
- Dealer rate collection from groups
- Product catalog and order management
- Ecommerce platform integration
- Social media publishing
- WhatsApp channel relay automation
- Customer CRM and segmentation
- n8n / Google Sheets workflows
- Agentic AI task execution
- MCP / ChatGPT / Claude connector experiments

## 2. Current Technical Stack

Primary runtime:

- Node.js 18+
- Express.js
- Socket.io
- Baileys / WhatsApp Web style local sessions
- Optional WhatsApp Cloud API support
- JSON-file persistence for the live monolith
- Optional Redis/BullMQ or JSON durable queue fallback
- Node-cron scheduling
- Multer upload support
- QR code support
- PDF/XLSX/report tooling
- Docker, Render, Railway, Fly, Kubernetes, Caddy, Nginx deployment configs

Secondary / modular stacks:

- `backend/` contains more structured service/routes modules.
- `frontend/` contains a Next.js style dashboard section.
- `lovable-app/` contains the Lovable/TanStack/Supabase app implementation.
- `mcp/` contains MCP and ChatGPT connector servers.
- `agent-runtime/` contains sandboxed local agent execution runtime.

## 3. Main Repo Structure

Important directories:

- `server.js` - active monolithic Express backend and dashboard route source.
- `public/` - active dashboard UI, assets, pages, file libraries.
- `lib/` - core business libraries: queue, reporting, store builder, AI agent, CRM, marketing.
- `integrations/` - n8n, Telegram, social, video, paperclip-style integrations.
- `automations/` - scheduled/business automations such as orders, stock, group analytics.
- `backend/src/` - structured backend modules for payment, WhatsApp, dealer intelligence, AI agent, routes.
- `wa-sales-bot/` - standalone WhatsApp sales bot implementation.
- `whatsapp-ai-tools-bot/` - standalone AI tools bot implementation.
- `lovable-app/` - Lovable dashboard app with Supabase migrations and app routes.
- `mcp/` - MCP server and ChatGPT connector.
- `agent-runtime/` - supervised agent runtime and sandbox tooling.
- `n8n-workflows/` and `integrations/n8n/workflows/` - workflow JSONs.
- `docs/` - project documentation and handoff files.
- `deploy/`, `k8s/`, `docker-compose*.yml`, `render.yaml`, `railway.json`, `fly.toml` - deployment assets.

## 4. Primary Backend Architecture

The live app is still mostly powered by root `server.js`, which contains:

- Express routes
- Socket.io events
- WhatsApp session handling
- WhatsApp channel publisher
- social media routes
- ecommerce integration routes
- CRM/customer routes
- product/order/payment routes
- automation settings
- channel relays
- group management
- scraping/web intelligence
- AI automation and algorithms
- agent runtime control routes
- queue/report connector endpoints
- setup validator and launch status endpoints

Important note for future agents:

Do not assume `backend/src` is the only active backend. The root `server.js` is the live route mount point for most dashboard features.

## 5. Main Dashboard

Primary dashboard:

- `public/index.html`
- Served from `GET /`
- Operational dark UI branded as SuperSender Pro

Major dashboard sections include:

- Dashboard
- WhatsApp
- Product Catalog
- WA Bot / Conversations
- Customers CRM
- Orders
- Commerce
- Payments
- Plans
- AI Inbox Cockpit
- Flow Builder
- Smart Broadcast
- Campaigns
- Broadcast
- Social Hub
- Channel automation
- Groups
- Analytics
- Settings

The dashboard is not purely static. It calls backend API endpoints through internal `api()` helpers and has live controls for many modules.

## 6. WhatsApp Automation

Existing WhatsApp features:

- QR connection page: `/wa-qr`
- WhatsApp status API: `/api/wa/status`
- WhatsApp connect/reset/disconnect APIs
- Multi-account/session support endpoints
- Pairing-code endpoint
- Contacts/chats/conversations APIs
- Group member export and group broadcast APIs
- Product send/bulk send features
- Bot reply flows for AI tools, laptops, accessories, dry fruits, shirts, scholarships, real estate, Ilm o Danish, payments/orders
- Admin command support in the bot logic
- WhatsApp automation settings for reusable client packages
- Optional official WhatsApp Cloud API support

Important WhatsApp files:

- `backend/src/whatsapp/baileysClient.js`
- `backend/src/whatsapp/messageHandler.js`
- `backend/src/whatsapp/groupManager.js`
- `backend/src/whatsapp/waSenderIntegration.js`
- `backend/src/whatsapp/messageTemplates.js`
- `wa-sales-bot/bot/flows/*`
- `whatsapp-ai-tools-bot/src/*`

## 7. WhatsApp Cloud API

Cloud API config exists in `.env.example`:

- `WHATSAPP_CLOUD_API_ENABLED`
- `WHATSAPP_CLOUD_PHONE_NUMBER_ID`
- `WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_CLOUD_ACCESS_TOKEN`
- `WHATSAPP_CLOUD_VERIFY_TOKEN`
- `WHATSAPP_CLOUD_WEBHOOK_SECRET`

Routes include:

- `GET /api/whatsapp-cloud/status`
- `POST /api/whatsapp-cloud/settings`
- `POST /api/whatsapp-cloud/send-text`
- `POST /api/whatsapp-cloud/send-template`
- `GET /api/whatsapp-cloud/webhook`
- `POST /api/whatsapp-cloud/webhook`
- `GET /whatsapp-cloud-api`

Status:

- Code support exists.
- Real production use still requires Meta app, phone number ID, WABA ID, access token, verify token, and payment/business setup.

## 8. AI Tools Reseller System

The system supports an AI tools resale business:

- Plans/pricing UI
- Available/not available status
- Product catalog
- Orders
- Payments
- Bot responses
- Giveaway support
- CapCut and AI tools plan categories
- Stock status handling
- Customer CRM
- Warranty/issue concepts in backend modules

Standalone AI tools bot:

- `whatsapp-ai-tools-bot/`

Sales bot implementation:

- `wa-sales-bot/`

Backend modules:

- `backend/src/bot/flows/welcome.js`
- `backend/src/bot/flows/rates.js`
- `backend/src/bot/flows/order.js`
- `backend/src/bot/flows/availability.js`
- `backend/src/bot/flows/issue.js`
- `backend/src/bot/flows/followup.js`
- `backend/src/bot/flows/botService.js`

## 9. Dealer Intelligence

Dealer intelligence exists in multiple places:

- Root server group/rate endpoints
- `wa-sales-bot/bot/dealerIntelligence/*`
- `backend/src/dealerIntelligence/*`
- `backend/src/services/dealerIntelligence.js`

Capabilities:

- Group message monitoring
- Dealer rate parsing
- Trust manager
- Stock manager
- Price analytics
- Dealer access/profile logic
- Group price capture
- Seller rate storage
- Best/lowest rate ideas

Important files:

- `backend/src/dealerIntelligence/dealerParser.js`
- `backend/src/dealerIntelligence/groupMonitor.js`
- `backend/src/dealerIntelligence/trustManager.js`
- `backend/src/dealerIntelligence/stockManager.js`
- `backend/src/dealerIntelligence/priceAnalytics.js`
- `wa-sales-bot/bot/dealerIntelligence/*`

## 10. Ecommerce Platform Layer

SuperSender Pro now has a universal ecommerce layer.

UI:

- Main dashboard Commerce section
- Full page: `/ecommerce-hub`

APIs:

- `GET /api/ecommerce/status`
- `GET /api/ecommerce/platforms`
- `GET /api/ecommerce/features`
- `POST /api/ecommerce/automation-plan`
- `GET /api/ecommerce/repo-blueprints`
- `GET /api/ecommerce/repo-blueprints/:slug/prompt`
- `GET /api/ecommerce/automation-recipes`
- `POST /api/ecommerce/automation-recipes/:id/draft`
- `POST /api/ecommerce/automation-recipes/:id/send`
- `GET /api/ecommerce/connections`
- `POST /api/ecommerce/connections`
- `PUT /api/ecommerce/connections/:id`
- `DELETE /api/ecommerce/connections/:id`
- `POST /api/ecommerce/connections/:id/test`
- `POST /api/ecommerce/connections/:id/sync-products`
- `POST /api/ecommerce/connections/:id/sync-orders`
- `POST /api/ecommerce/sync-all`
- `POST /api/ecommerce/webhook/:platform/:connectionId?`

Supported ecommerce platforms:

- Shopify
- WooCommerce
- Magento / Adobe Commerce
- BigCommerce
- Ecwid
- OpenCart
- Wix Stores
- Squarespace Commerce
- Daraz Seller Center
- Dukaan
- Amazon Seller / SP-API through bridge/feed
- eBay through bridge/feed
- Etsy through bridge/feed
- Lazada through bridge/feed
- AliExpress / Dropshipping feed
- SHOPLINE
- Shopware
- commercetools through bridge/feed
- Square Online
- Lightspeed
- Odoo Ecommerce
- Zoho Commerce
- WhatsApp Catalog / Manual Store
- Custom Website / API

Ecommerce features:

- Product sync
- Order sync
- Universal webhook ingestion
- JSON feed bridge
- Abandoned cart recovery
- COD confirmation
- Payment recovery
- Stock alerts
- Review requests
- WhatsApp catalog sync concepts
- Smart checkout links
- Delay notices
- Cross-channel capture

Doc:

- `docs/ecommerce-platform-completion.md`

## 11. Social Media Automation

The project has a Social Hub and integrations for:

- Facebook Page
- Instagram Business
- LinkedIn
- TikTok setup concepts
- Telegram bridge
- Video autoposting
- Social auto-post folder
- AI-generated captions

Important files:

- `integrations/socialHub.js`
- `integrations/telegramBridge.js`
- `integrations/videoAgent.js`
- `frontend/app/social/page.js`
- `social-auto-posts/`
- `video-auto-posts/`

Typical env keys:

- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FB_PAGE_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ID`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_IG_USER_ID`
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_AUTHOR_URN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Status:

- UI and backend support exist.
- Real posting requires real platform OAuth/token setup.
- Tokens must remain local and must not be committed.

## 12. WhatsApp Channel Automation

The project has extensive channel automation:

- Channel QR page: `/wa-channel-qr`
- Channel publisher status/connect/reset APIs
- Source/target channel configuration
- Relay drafts
- Manual packets
- Channel posts
- Templates
- Watchdog
- Fast mode
- Source intelligence
- Source doctor
- Queue cleaner
- Gap filler
- Drip posting
- Conditional rules
- Media pipeline
- Facebook bridge dry-run/share route
- Channel activity and automation pack

Important APIs include:

- `GET /api/wa/channel-publisher/status`
- `POST /api/wa/channel-publisher/connect`
- `GET /api/wa/channel-publisher/qr`
- `POST /api/wa/channel-publisher/reset`
- `GET /api/wa/channels`
- `GET /api/wa/channels/discover`
- `POST /api/wa/channels/copy/automation`
- `GET /api/wa/channels/watchdog`
- `POST /api/wa/channels/watchdog`
- `POST /api/wa/channels/share-facebook`
- `POST /api/wa/channels/jobs`
- `POST /api/wa/channels/media-pipeline`
- `POST /webhook/channel-post`

Status:

- Many automation controls exist.
- Some WhatsApp channel direct publishing is limited by WhatsApp Web/Baileys behavior and may fall back to manual packet/copy-paste flows.

## 13. Google Sheets, n8n, Queue, Reports

Queue:

- `lib/queueManager.js`
- Optional Redis/BullMQ style via env
- JSON durable fallback when Redis/BullMQ is not active

Reporting:

- `lib/reportingConnectors.js`
- Google Sheets REST/JWT support without requiring `googleapis` in root app
- Dry-run support
- JSON fallback export

APIs:

- `GET /api/queue/status`
- `GET /api/queue/jobs`
- `POST /api/queue/enqueue`
- `POST /api/queue/process-due`
- `GET /api/reports/connectors/status`
- `POST /api/reports/sync/google-sheets`
- `POST /api/reports/trigger/n8n`
- `POST /api/reports/sync/all`

n8n:

- `integrations/n8nBridge.js`
- `wa-sales-bot/lib/n8nBridge.js`
- `n8n-workflows/*.json`
- `integrations/n8n/workflows/*.json`

Docs:

- `docs/durable-queue-n8n-sheets.md`

Status:

- Code is wired.
- Real Google Sheets needs `GOOGLE_SHEETS_ID`, service account email/key.
- Real n8n needs `N8N_ENABLED=true` and webhook URLs.

## 14. Payment Automation

Payment modules exist for:

- JazzCash
- EasyPaisa
- Bank transfer
- Gmail/IMAP email parser
- Payment verifier
- Payment queue
- Payment reminders

Important files:

- `backend/src/payment/emailParser.js`
- `backend/src/payment/verifier.js`
- `backend/src/payment/jazzcash.js`
- `backend/src/payment/easypaisa.js`
- `backend/src/queues/paymentQueue.js`
- `automations/paymentReminder.js`

Status:

- Code modules exist.
- Real production requires actual email credentials, payment notification email patterns, and merchant/bank configuration.

## 15. AI Agent and Automation Layer

AI/agentic components:

- Intent classification
- Knowledge base answers
- Issue resolver
- Escalation
- AI algorithms catalog
- AI automation hub
- Agent registry
- Mission/task planning
- Scraping agent
- PC agent control
- Claw/OpenClaw/Hermes/OpenHands/CrewAI-style integrations
- Project prompt agent
- Self-healing agent concepts

Important files:

- `backend/src/aiAgent/*`
- `ai/workflowEngine.js`
- `ai/agents/selfHealingAgent.js`
- `ai/agents/salesAgent.js`
- `lib/aiAgent.js`
- `agent-runtime/*`
- `routes/agentRuntime.js`

Important APIs:

- `/api/ai-automation/*`
- `/api/ai-algorithms/*`
- `/api/claw-runtime/*`
- `/api/pc-agents/*`
- `/api/scraping-agent/*`

Status:

- Control surfaces and adapter stubs exist.
- Real external agent execution requires URLs/API keys for each agent provider.

## 16. MCP / Claude / ChatGPT Connector

The project includes MCP tooling:

- `mcp/index.js`
- `mcp/supersender-mcp.js`
- `mcp/transport/http.js`
- `mcp/chatgpt/server.js`
- `mcp/claude-desktop-config.example.json`

Scripts:

- `npm run mcp`
- `npm run mcp:chatgpt`

Purpose:

- Expose SuperSender capabilities to Claude Desktop/Cursor through MCP.
- Expose ChatGPT Custom GPT Actions through OpenAPI.

Status:

- Code exists.
- Needs deployed public URL and auth tokens for real external ChatGPT/Claude usage.

## 17. Lovable App

Lovable app directory:

- `lovable-app/`

Contains:

- TanStack/Vite style app
- Supabase integration
- Routes for dashboard, WhatsApp, social, channels, commerce, catalog, orders, payments, settings, flows, analytics, etc.
- Supabase migrations
- UI components

Important docs:

- `LOVABLE_APP_INTEGRATION.md`
- `README_GITHUB_LOVABLE.md`
- `GITHUB_LOVABLE_UPLOAD_GUIDE.md`

Status:

- Lovable frontend exists.
- Local/real backend still required for WhatsApp/Baileys/channel sessions because serverless/static hosting cannot keep long-lived WhatsApp sessions alive reliably.

## 18. Deployment Assets

Deployment/config files:

- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docker-compose.agent-runtime.yml`
- `DEPLOYMENT.md`
- `deploy.sh`
- `render.yaml`
- `railway.json`
- `fly.toml`
- `nginx.conf`
- `deploy/caddy/*`
- `k8s/*`
- `.github/workflows/*`

Supported deployment ideas:

- Local Windows server
- Docker Compose
- Render
- Railway
- Fly.io
- Kubernetes
- Caddy/Nginx reverse proxy
- Cloudflare Tunnel

## 19. Environment Variables

`.env.example` is extensive and covers:

- WhatsApp/Baileys sessions
- WhatsApp Cloud API
- Admin numbers
- Selling/customer groups
- Telegram
- Ecommerce platform credentials
- Payment settings
- Gmail/email parser
- OAuth providers
- MCP/GPT connector
- Google Sheets
- Tavily/web intelligence
- Firecrawl/Crawlee/browser-use style workers
- Agentic frameworks
- Social platforms
- Video provider APIs
- n8n
- Database/JWT/encryption
- Redis/queue
- Agent runtime

Critical rule:

Never commit real `.env`, runtime `data/*.json`, WhatsApp sessions, QR/auth folders, logs, uploads, or token files.

## 20. Security and Compliance Notes

Safe defaults:

- Source repo should contain code and placeholder examples only.
- Runtime credentials must stay local.
- WhatsApp Cloud API should be used for official production messaging where possible.
- Promotional/broadcast automation should enforce opt-in and frequency caps.
- Social platform posting requires official APIs/tokens/OAuth.
- Avoid bypass/anti-ban/spam behavior.
- Any high-volume messaging should include:
  - opt-in tracking
  - opt-out handling
  - throttling
  - audit logs
  - admin approval for risky campaigns

Known sensitive paths to avoid committing:

- `.env`
- `.wa-auth/`
- `.baileys-auth/`
- `data/*.json`
- `logs/`
- `uploads/`
- `node_modules/`
- `node-local.exe`
- Cloudflare tunnel token files
- WhatsApp session files

## 21. Current Git State at Last Scan

Latest observed commit:

- `e62132f Expose universal ecommerce connector UI`

Recent commits:

- `e62132f` - universal ecommerce connector UI
- `ed1c159` - agent sandbox runtime
- `eea7499` - production deployment layer
- `6884905` - durable queue reporting bridge
- `3c71ea1` - competitor features control center

Branch status at scan:

- `main...origin/main`
- clean at scan time before creating this report

## 22. What Is Strong / Mostly Built

Strong areas:

- Huge active Express backend
- Live dashboard
- WhatsApp QR/session control
- Commerce integration backend and UI
- Product/order/customer/payment management
- Channel automation APIs
- n8n/Sheets/queue bridge
- Social posting scaffolding
- AI agent catalogs and control routes
- MCP and ChatGPT connector code
- Deployment configs
- Lovable app frontend
- Documentation/backlog files

## 23. What Still Needs Final Production Work

Production completion priorities:

1. Stabilize live server performance:
   - split huge `server.js` into route modules gradually
   - add request timing logs
   - cache dashboard static assets
   - verify memory usage under long runtime

2. Finish official WhatsApp Cloud API production:
   - Meta app
   - WABA
   - phone number ID
   - webhook verification
   - templates
   - payment setup

3. Complete OAuth for social:
   - Meta/Facebook OAuth
   - Instagram Business OAuth/page link
   - LinkedIn OAuth
   - token refresh and masked storage

4. Make queue durable:
   - add Redis service in production
   - switch from JSON fallback to Redis/BullMQ or equivalent

5. Connect real Google Sheets/n8n:
   - service account config
   - sheet ID
   - live n8n webhook URLs

6. Add tests around core launch paths:
   - WhatsApp status
   - ecommerce connection save/test
   - order creation
   - queue/reporting
   - channel relay dry-run

7. Harden security:
   - auth middleware on admin APIs
   - CSRF for dashboard forms
   - API key or session auth
   - rate limits
   - audit logs

8. Fix encoding issues where mojibake appears:
   - ensure UTF-8 file writes
   - normalize emoji/Urdu text rendering
   - avoid corrupted legacy strings

9. Separate public deploy from local WhatsApp runtime:
   - public dashboard/API can run on cloud
   - WhatsApp/Baileys session runner can run on local/VPS worker
   - connect them by API queue/webhook

10. Create final launch checklist:
   - domain
   - SSL
   - admin login
   - backups
   - monitoring
   - uptime checks
   - rollback process

## 24. Commands

Root server:

```bash
npm install
npm start
```

Dev:

```bash
npm run dev
```

MCP:

```bash
npm run mcp
npm run mcp:chatgpt
```

Lovable app:

```bash
npm run lovable:dev
npm run lovable:build
```

Launch checks:

```bash
npm run health
npm run launch:check
npm run test:api
```

## 25. Best Instruction Prompt for Any LLM/Agent

Use this prompt when handing the project to any LLM:

```text
You are working on SuperSender Pro, a large WhatsApp-first AI Business Command Center.

Main repo path:
D:\SuperSenderPro\repo-ready-to-push\supersenderpro-update

Live local app path:
D:\SuperSenderPro\supersender-pro-final

Main active backend:
server.js

Main active dashboard:
public/index.html

Do not assume backend/src is the live route mount point. Most live routes are in root server.js.

Before changing anything:
1. Run git status --short --branch.
2. Run git fetch origin main.
3. If behind and clean, pull with --ff-only.
4. Scan existing code first; other agents may have recently pushed changes.
5. Do not overwrite unrelated changes.
6. Do not stage or commit secrets/runtime files:
   - .env
   - data/*.json
   - logs/
   - uploads/
   - .wa-auth/
   - .baileys-auth/
   - node_modules/
   - node-local.exe

Current major modules:
- WhatsApp/Baileys bot and QR connection
- Optional WhatsApp Cloud API
- AI tools reseller plans/products/orders/payments
- Dealer intelligence and group rate collection
- Ecommerce hub with 24 platforms
- Social Hub for Facebook/Instagram/LinkedIn/TikTok concepts
- WhatsApp channel automation and relay system
- Telegram bridge
- n8n bridge and workflows
- Google Sheets reporting bridge
- Durable queue manager with JSON fallback and optional Redis
- Agentic automation catalog and agent runtime
- MCP server and ChatGPT OpenAPI connector
- Lovable app frontend and Supabase migrations
- Deployment configs for Docker, Render, Railway, Fly, Kubernetes, Caddy/Nginx

If asked to add a feature:
- Prefer adding it to existing route/UI/module patterns.
- Do not build a duplicate parallel system.
- Keep changes small and verifiable.
- Add docs when the feature is important.
- Run syntax checks.
- Test live endpoints on localhost:3001 where possible.
- Stage only safe files.
- Scan staged diff for token-like strings before committing.
- If push is rejected, fetch/rebase then push again.

Recommended next work:
1. Add SuperFlow Studio visual automation builder.
2. Harden admin auth and API security.
3. Finish official WhatsApp Cloud API setup flow.
4. Add Redis queue production mode.
5. Add Google Sheets/n8n setup wizard.
6. Add Meta/LinkedIn OAuth flow.
7. Modularize server.js gradually.
8. Add launch test dashboard.
9. Fix UTF-8/mojibake text issues.
10. Prepare public cloud + local WhatsApp worker architecture.
```

## 26. One-Line Summary

SuperSender Pro is now a broad WhatsApp-first business automation platform with sales bots, ecommerce connectors, channel automation, AI agents, MCP connectors, reporting, queues, social posting scaffolds, and deployment assets; the remaining work is production hardening, real credential setup, official API/OAuth completion, modularization, and launch testing.
