# SuperSender Pro — API Reference (auto-generated)

> Auto-extracted from `server.js` on 2026-06-19.
> **806 routes** across **131 groups**. Regenerate with `npm run docs:api`.

## Contents
- [`/api/(non-/api)`](#api-non-api-) (36)
- [`/api/ab-tests`](#apiab-tests) (11)
- [`/api/account-health`](#apiaccount-health) (1)
- [`/api/action-triggers`](#apiaction-triggers) (5)
- [`/api/agents`](#apiagents) (11)
- [`/api/ai`](#apiai) (10)
- [`/api/ai-algorithms`](#apiai-algorithms) (5)
- [`/api/ai-automation`](#apiai-automation) (18)
- [`/api/ai-tools`](#apiai-tools) (1)
- [`/api/ai-training`](#apiai-training) (6)
- [`/api/alerts`](#apialerts) (6)
- [`/api/analytics`](#apianalytics) (12)
- [`/api/apikeys`](#apiapikeys) (3)
- [`/api/appointments`](#apiappointments) (3)
- [`/api/automation`](#apiautomation) (3)
- [`/api/automations`](#apiautomations) (2)
- [`/api/autopilot`](#apiautopilot) (3)
- [`/api/autoreplies`](#apiautoreplies) (4)
- [`/api/autoreply`](#apiautoreply) (4)
- [`/api/backup`](#apibackup) (4)
- [`/api/blacklist`](#apiblacklist) (3)
- [`/api/broadcast`](#apibroadcast) (2)
- [`/api/campaigns`](#apicampaigns) (8)
- [`/api/carousels`](#apicarousels) (3)
- [`/api/catalogs`](#apicatalogs) (5)
- [`/api/categories`](#apicategories) (2)
- [`/api/channels`](#apichannels) (5)
- [`/api/claw-runtime`](#apiclaw-runtime) (5)
- [`/api/cockpit`](#apicockpit) (2)
- [`/api/code-intelligence`](#apicode-intelligence) (2)
- [`/api/commerce`](#apicommerce) (10)
- [`/api/communities`](#apicommunities) (4)
- [`/api/compliance`](#apicompliance) (3)
- [`/api/consent`](#apiconsent) (1)
- [`/api/contacts`](#apicontacts) (3)
- [`/api/credential-stock`](#apicredential-stock) (5)
- [`/api/crm-sync`](#apicrm-sync) (5)
- [`/api/customers`](#apicustomers) (19)
- [`/api/dashboard`](#apidashboard) (1)
- [`/api/diagnostics`](#apidiagnostics) (2)
- [`/api/ecommerce`](#apiecommerce) (19)
- [`/api/export`](#apiexport) (2)
- [`/api/feedback`](#apifeedback) (8)
- [`/api/files`](#apifiles) (4)
- [`/api/flows`](#apiflows) (8)
- [`/api/followups`](#apifollowups) (1)
- [`/api/fulfillment`](#apifulfillment) (2)
- [`/api/gmail`](#apigmail) (15)
- [`/api/gpt-connector`](#apigpt-connector) (1)
- [`/api/group-finder`](#apigroup-finder) (8)
- [`/api/group-prices`](#apigroup-prices) (3)
- [`/api/groups`](#apigroups) (29)
- [`/api/handoffs`](#apihandoffs) (3)
- [`/api/health`](#apihealth) (1)
- [`/api/hitl`](#apihitl) (3)
- [`/api/identity`](#apiidentity) (1)
- [`/api/import`](#apiimport) (4)
- [`/api/imported-skills`](#apiimported-skills) (5)
- [`/api/inbox`](#apiinbox) (10)
- [`/api/integrations`](#apiintegrations) (3)
- [`/api/invoice`](#apiinvoice) (1)
- [`/api/invoices`](#apiinvoices) (2)
- [`/api/issues`](#apiissues) (6)
- [`/api/journey-map`](#apijourney-map) (1)
- [`/api/laptop-bot`](#apilaptop-bot) (6)
- [`/api/laptop-leads`](#apilaptop-leads) (1)
- [`/api/launch-doctor`](#apilaunch-doctor) (1)
- [`/api/lead-lifecycle`](#apilead-lifecycle) (1)
- [`/api/leads`](#apileads) (3)
- [`/api/licenses`](#apilicenses) (5)
- [`/api/links`](#apilinks) (6)
- [`/api/live-chats`](#apilive-chats) (2)
- [`/api/logic-rules`](#apilogic-rules) (4)
- [`/api/logs`](#apilogs) (3)
- [`/api/marketing`](#apimarketing) (2)
- [`/api/mcp`](#apimcp) (4)
- [`/api/merge-fields`](#apimerge-fields) (2)
- [`/api/messenger`](#apimessenger) (3)
- [`/api/n8n`](#apin8n) (5)
- [`/api/orders`](#apiorders) (8)
- [`/api/paperclip`](#apipaperclip) (2)
- [`/api/payments`](#apipayments) (5)
- [`/api/pc-agents`](#apipc-agents) (4)
- [`/api/plans`](#apiplans) (6)
- [`/api/platform`](#apiplatform) (2)
- [`/api/polls`](#apipolls) (5)
- [`/api/price-intel`](#apiprice-intel) (7)
- [`/api/price-monitors`](#apiprice-monitors) (4)
- [`/api/privacy`](#apiprivacy) (3)
- [`/api/products`](#apiproducts) (13)
- [`/api/project`](#apiproject) (2)
- [`/api/project-agent`](#apiproject-agent) (3)
- [`/api/quick-replies`](#apiquick-replies) (9)
- [`/api/reminders`](#apireminders) (5)
- [`/api/reply-speed`](#apireply-speed) (2)
- [`/api/reports`](#apireports) (3)
- [`/api/retargeting`](#apiretargeting) (2)
- [`/api/reviews`](#apireviews) (5)
- [`/api/safety`](#apisafety) (8)
- [`/api/sales-activation`](#apisales-activation) (3)
- [`/api/scheduled-messages`](#apischeduled-messages) (4)
- [`/api/scholarship-pipeline`](#apischolarship-pipeline) (10)
- [`/api/scraping-agent`](#apiscraping-agent) (7)
- [`/api/search`](#apisearch) (7)
- [`/api/seller-rates`](#apiseller-rates) (8)
- [`/api/sequences`](#apisequences) (4)
- [`/api/settings`](#apisettings) (2)
- [`/api/sla`](#apisla) (2)
- [`/api/social`](#apisocial) (21)
- [`/api/stock-sourcing`](#apistock-sourcing) (4)
- [`/api/student-website`](#apistudent-website) (6)
- [`/api/subscriptions`](#apisubscriptions) (1)
- [`/api/supervision`](#apisupervision) (1)
- [`/api/system`](#apisystem) (2)
- [`/api/template`](#apitemplate) (1)
- [`/api/template-approvals`](#apitemplate-approvals) (3)
- [`/api/templates`](#apitemplates) (10)
- [`/api/text`](#apitext) (2)
- [`/api/tools`](#apitools) (8)
- [`/api/update`](#apiupdate) (2)
- [`/api/upload`](#apiupload) (1)
- [`/api/wa`](#apiwa) (131)
- [`/api/watchdog`](#apiwatchdog) (3)
- [`/api/web-bridge`](#apiweb-bridge) (4)
- [`/api/web-intel`](#apiweb-intel) (5)
- [`/api/webhook`](#apiwebhook) (1)
- [`/api/webhooks`](#apiwebhooks) (8)
- [`/api/whatsapp`](#apiwhatsapp) (2)
- [`/api/whatsapp-cloud`](#apiwhatsapp-cloud) (6)
- [`/api/whatsapp-forms`](#apiwhatsapp-forms) (6)
- [`/api/workflows`](#apiworkflows) (7)

## /api/(non-/api)

| Method | Endpoint |
|---|---|
| `GET` | `*` |
| `GET` | `/` |
| `GET` | `/ai-algorithms` |
| `GET` | `/ai-automation-hub` |
| `GET` | `/antigravity-next-50` |
| `GET` | `/claw-runtime` |
| `GET` | `/code-intelligence` |
| `GET` | `/ecommerce-hub` |
| `GET` | `/files` |
| `GET` | `/fulfillment` |
| `GET` | `/gmail` |
| `GET` | `/imported-skills` |
| `GET` | `/l/:code` |
| `GET` | `/mcp` |
| `POST` | `/mcp` |
| `POST` | `/mcp/send` |
| `GET` | `/pc-agent-control` |
| `GET` | `/project-agent` |
| `GET` | `/project-completion` |
| `GET` | `/sales-activation` |
| `GET` | `/scholarships/:slug` |
| `GET` | `/scraping-agent-hub` |
| `GET` | `/setup-validator` |
| `GET` | `/social-connect` |
| `POST` | `/social-connect/credentials` |
| `GET` | `/student-bot` |
| `GET` | `/wa-automation-settings` |
| `GET` | `/wa-channel-qr` |
| `GET` | `/wa-client-onboarding` |
| `GET` | `/wa-qr` |
| `POST` | `/webhook/channel-post` |
| `GET` | `/webhook/meta` |
| `POST` | `/webhook/meta` |
| `POST` | `/webhook/social/:platform` |
| `GET` | `/whatsapp` |
| `GET` | `/whatsapp-cloud-api` |

## /api/ab-tests

| Method | Endpoint |
|---|---|
| `GET` | `/api/ab-tests` |
| `POST` | `/api/ab-tests` |
| `DELETE` | `/api/ab-tests/:id` |
| `GET` | `/api/ab-tests/:id` |
| `PUT` | `/api/ab-tests/:id` |
| `POST` | `/api/ab-tests/:id/analyze` |
| `POST` | `/api/ab-tests/:id/launch` |
| `GET` | `/api/ab-tests/:id/results` |
| `POST` | `/api/ab-tests/:id/start` |
| `POST` | `/api/ab-tests/:id/stop` |
| `POST` | `/api/ab-tests/:testId/record/:variantId` |

## /api/account-health

| Method | Endpoint |
|---|---|
| `GET` | `/api/account-health` |

## /api/action-triggers

| Method | Endpoint |
|---|---|
| `GET` | `/api/action-triggers` |
| `POST` | `/api/action-triggers` |
| `DELETE` | `/api/action-triggers/:id` |
| `PUT` | `/api/action-triggers/:id` |
| `POST` | `/api/action-triggers/test` |

## /api/agents

| Method | Endpoint |
|---|---|
| `GET` | `/api/agents` |
| `POST` | `/api/agents` |
| `DELETE` | `/api/agents/:id` |
| `PUT` | `/api/agents/:id` |
| `POST` | `/api/agents/chat` |
| `GET` | `/api/agents/learning` |
| `POST` | `/api/agents/learning/feedback` |
| `POST` | `/api/agents/route-chat` |
| `GET` | `/api/agents/routing-rules` |
| `POST` | `/api/agents/routing-rules` |
| `DELETE` | `/api/agents/routing-rules/:id` |

## /api/ai

| Method | Endpoint |
|---|---|
| `POST` | `/api/ai/analyze-specs` |
| `POST` | `/api/ai/audio-reply` |
| `POST` | `/api/ai/generate-options` |
| `POST` | `/api/ai/intent-analyze` |
| `GET` | `/api/ai/providers` |
| `POST` | `/api/ai/suggest` |
| `POST` | `/api/ai/suggest-reply` |
| `POST` | `/api/ai/summarize-chats` |
| `POST` | `/api/ai/test` |
| `POST` | `/api/ai/transcribe-audio` |

## /api/ai-algorithms

| Method | Endpoint |
|---|---|
| `GET` | `/api/ai-algorithms/catalog` |
| `GET` | `/api/ai-algorithms/prompt` |
| `POST` | `/api/ai-algorithms/recommend` |
| `POST` | `/api/ai-algorithms/run` |
| `GET` | `/api/ai-algorithms/status` |

## /api/ai-automation

| Method | Endpoint |
|---|---|
| `GET` | `/api/ai-automation/agent-prompt` |
| `GET` | `/api/ai-automation/agent-registry` |
| `POST` | `/api/ai-automation/agent-registry` |
| `POST` | `/api/ai-automation/agent-task-plan` |
| `GET` | `/api/ai-automation/missions` |
| `POST` | `/api/ai-automation/missions` |
| `PATCH` | `/api/ai-automation/missions/:id` |
| `POST` | `/api/ai-automation/missions/:id/run` |
| `POST` | `/api/ai-automation/playbook` |
| `GET` | `/api/ai-automation/repo-catalog` |
| `GET` | `/api/ai-automation/repo-catalog-prompt` |
| `POST` | `/api/ai-automation/repo-import` |
| `POST` | `/api/ai-automation/repo-plan` |
| `GET` | `/api/ai-automation/repos` |
| `POST` | `/api/ai-automation/run-task` |
| `GET` | `/api/ai-automation/skills` |
| `POST` | `/api/ai-automation/skills/install` |
| `GET` | `/api/ai-automation/status` |

## /api/ai-tools

| Method | Endpoint |
|---|---|
| `POST` | `/api/ai-tools/recommendation-quiz` |

## /api/ai-training

| Method | Endpoint |
|---|---|
| `POST` | `/api/ai-training/ask` |
| `POST` | `/api/ai-training/ingest-url` |
| `GET` | `/api/ai-training/sources` |
| `POST` | `/api/ai-training/sources` |
| `DELETE` | `/api/ai-training/sources/:id` |
| `POST` | `/api/ai-training/upload` |

## /api/alerts

| Method | Endpoint |
|---|---|
| `DELETE` | `/api/alerts` |
| `GET` | `/api/alerts` |
| `POST` | `/api/alerts` |
| `DELETE` | `/api/alerts/:id` |
| `PUT` | `/api/alerts/:id/read` |
| `PUT` | `/api/alerts/read-all` |

## /api/analytics

| Method | Endpoint |
|---|---|
| `GET` | `/api/analytics/compare-periods` |
| `GET` | `/api/analytics/compare-periods/export` |
| `GET` | `/api/analytics/financials` |
| `GET` | `/api/analytics/messages` |
| `GET` | `/api/analytics/messages/customer/:number` |
| `POST` | `/api/analytics/messages/event` |
| `GET` | `/api/analytics/revenue-attribution` |
| `POST` | `/api/analytics/sentiment` |
| `POST` | `/api/analytics/sentiment/batch-analyze` |
| `GET` | `/api/analytics/sentiment/customer/:customerId` |
| `GET` | `/api/analytics/sentiment/customers/:sentiment` |
| `GET` | `/api/analytics/sentiment/overall` |

## /api/apikeys

| Method | Endpoint |
|---|---|
| `GET` | `/api/apikeys` |
| `POST` | `/api/apikeys` |
| `DELETE` | `/api/apikeys/:id` |

## /api/appointments

| Method | Endpoint |
|---|---|
| `GET` | `/api/appointments` |
| `POST` | `/api/appointments` |
| `PUT` | `/api/appointments/:id` |

## /api/automation

| Method | Endpoint |
|---|---|
| `POST` | `/api/automation/followup-cold-leads` |
| `POST` | `/api/automation/revenue-report` |
| `POST` | `/api/automation/smart-catalog` |

## /api/automations

| Method | Endpoint |
|---|---|
| `GET` | `/api/automations/status` |
| `POST` | `/api/automations/trigger/:name` |

## /api/autopilot

| Method | Endpoint |
|---|---|
| `GET` | `/api/autopilot` |
| `POST` | `/api/autopilot` |
| `POST` | `/api/autopilot/run` |

## /api/autoreplies

| Method | Endpoint |
|---|---|
| `GET` | `/api/autoreplies` |
| `POST` | `/api/autoreplies` |
| `DELETE` | `/api/autoreplies/:id` |
| `PUT` | `/api/autoreplies/:id` |

## /api/autoreply

| Method | Endpoint |
|---|---|
| `GET` | `/api/autoreply` |
| `POST` | `/api/autoreply` |
| `DELETE` | `/api/autoreply/:id` |
| `PUT` | `/api/autoreply/:id` |

## /api/backup

| Method | Endpoint |
|---|---|
| `POST` | `/api/backup/create` |
| `GET` | `/api/backup/list` |
| `POST` | `/api/backup/restore/:backupId` |
| `GET` | `/api/backup/stats` |

## /api/blacklist

| Method | Endpoint |
|---|---|
| `GET` | `/api/blacklist` |
| `POST` | `/api/blacklist` |
| `DELETE` | `/api/blacklist/:number` |

## /api/broadcast

| Method | Endpoint |
|---|---|
| `POST` | `/api/broadcast` |
| `POST` | `/api/broadcast/smart` |

## /api/campaigns

| Method | Endpoint |
|---|---|
| `GET` | `/api/campaigns` |
| `POST` | `/api/campaigns` |
| `GET` | `/api/campaigns/:id/export` |
| `GET` | `/api/campaigns/:id/export.csv` |
| `POST` | `/api/campaigns/:id/pause` |
| `POST` | `/api/campaigns/:id/resume` |
| `POST` | `/api/campaigns/:id/retry-failed` |
| `POST` | `/api/campaigns/:id/stop` |

## /api/carousels

| Method | Endpoint |
|---|---|
| `GET` | `/api/carousels` |
| `POST` | `/api/carousels` |
| `DELETE` | `/api/carousels/:id` |

## /api/catalogs

| Method | Endpoint |
|---|---|
| `GET` | `/api/catalogs` |
| `POST` | `/api/catalogs` |
| `DELETE` | `/api/catalogs/:id` |
| `GET` | `/api/catalogs/:id/message` |
| `POST` | `/api/catalogs/:id/send` |

## /api/categories

| Method | Endpoint |
|---|---|
| `GET` | `/api/categories` |
| `POST` | `/api/categories` |

## /api/channels

| Method | Endpoint |
|---|---|
| `GET` | `/api/channels/calling` |
| `POST` | `/api/channels/calling` |
| `PUT` | `/api/channels/calling/:id` |
| `POST` | `/api/channels/deploy-config` |
| `GET` | `/api/channels/deploy-summary` |

## /api/claw-runtime

| Method | Endpoint |
|---|---|
| `GET` | `/api/claw-runtime/agents` |
| `POST` | `/api/claw-runtime/plan` |
| `GET` | `/api/claw-runtime/prompt` |
| `POST` | `/api/claw-runtime/queue` |
| `GET` | `/api/claw-runtime/status` |

## /api/cockpit

| Method | Endpoint |
|---|---|
| `POST` | `/api/cockpit/quick-action` |
| `GET` | `/api/cockpit/share-template/:type` |

## /api/code-intelligence

| Method | Endpoint |
|---|---|
| `POST` | `/api/code-intelligence/scan` |
| `GET` | `/api/code-intelligence/status` |

## /api/commerce

| Method | Endpoint |
|---|---|
| `POST` | `/api/commerce/abandoned-cart/remind` |
| `POST` | `/api/commerce/delay-notify` |
| `GET` | `/api/commerce/events` |
| `POST` | `/api/commerce/order-update` |
| `GET` | `/api/commerce/settings` |
| `POST` | `/api/commerce/settings` |
| `POST` | `/api/commerce/smart-link` |
| `POST` | `/api/commerce/webhook/magento` |
| `POST` | `/api/commerce/webhook/shopify` |
| `POST` | `/api/commerce/webhook/woocommerce` |

## /api/communities

| Method | Endpoint |
|---|---|
| `GET` | `/api/communities` |
| `POST` | `/api/communities` |
| `DELETE` | `/api/communities/:id` |
| `PUT` | `/api/communities/:id` |

## /api/compliance

| Method | Endpoint |
|---|---|
| `POST` | `/api/compliance/check-message` |
| `GET` | `/api/compliance/opt-in-summary` |
| `GET` | `/api/compliance/policy` |

## /api/consent

| Method | Endpoint |
|---|---|
| `POST` | `/api/consent/track` |

## /api/contacts

| Method | Endpoint |
|---|---|
| `POST` | `/api/contacts/cross-channel-capture` |
| `GET` | `/api/contacts/export` |
| `POST` | `/api/contacts/sync` |

## /api/credential-stock

| Method | Endpoint |
|---|---|
| `GET` | `/api/credential-stock` |
| `POST` | `/api/credential-stock` |
| `PATCH` | `/api/credential-stock/:id` |
| `POST` | `/api/credential-stock/auto-deliver` |
| `POST` | `/api/credential-stock/bulk` |

## /api/crm-sync

| Method | Endpoint |
|---|---|
| `POST` | `/api/crm-sync/export` |
| `POST` | `/api/crm-sync/import` |
| `GET` | `/api/crm-sync/settings` |
| `POST` | `/api/crm-sync/settings` |
| `GET` | `/api/crm-sync/status` |

## /api/customers

| Method | Endpoint |
|---|---|
| `GET` | `/api/customers` |
| `POST` | `/api/customers` |
| `DELETE` | `/api/customers/:customerId/tags` |
| `POST` | `/api/customers/:customerId/tags` |
| `DELETE` | `/api/customers/:id` |
| `GET` | `/api/customers/:id` |
| `PATCH` | `/api/customers/:id` |
| `POST` | `/api/customers/:id/message` |
| `POST` | `/api/customers/:id/note` |
| `GET` | `/api/customers/:id/notes` |
| `POST` | `/api/customers/:id/notes` |
| `DELETE` | `/api/customers/:id/notes/:noteId` |
| `POST` | `/api/customers/:id/tags` |
| `GET` | `/api/customers/:id/timeline` |
| `DELETE` | `/api/customers/bulk` |
| `POST` | `/api/customers/bulk-delete` |
| `GET` | `/api/customers/segments` |
| `GET` | `/api/customers/tag/:tag` |
| `GET` | `/api/customers/tags` |

## /api/dashboard

| Method | Endpoint |
|---|---|
| `GET` | `/api/dashboard/summary` |

## /api/diagnostics

| Method | Endpoint |
|---|---|
| `GET` | `/api/diagnostics/idle-followups` |
| `GET` | `/api/diagnostics/ilm-danish` |

## /api/ecommerce

| Method | Endpoint |
|---|---|
| `POST` | `/api/ecommerce/automation-plan` |
| `GET` | `/api/ecommerce/automation-recipes` |
| `POST` | `/api/ecommerce/automation-recipes/:id/draft` |
| `POST` | `/api/ecommerce/automation-recipes/:id/send` |
| `GET` | `/api/ecommerce/connections` |
| `POST` | `/api/ecommerce/connections` |
| `DELETE` | `/api/ecommerce/connections/:id` |
| `PUT` | `/api/ecommerce/connections/:id` |
| `POST` | `/api/ecommerce/connections/:id/sync-orders` |
| `POST` | `/api/ecommerce/connections/:id/sync-products` |
| `POST` | `/api/ecommerce/connections/:id/test` |
| `GET` | `/api/ecommerce/features` |
| `GET` | `/api/ecommerce/platforms` |
| `GET` | `/api/ecommerce/repo-blueprints` |
| `GET` | `/api/ecommerce/repo-blueprints-prompt` |
| `GET` | `/api/ecommerce/repo-blueprints/:slug/prompt` |
| `GET` | `/api/ecommerce/status` |
| `POST` | `/api/ecommerce/sync-all` |
| `POST` | `/api/ecommerce/webhook/:platform/:connectionId?` |

## /api/export

| Method | Endpoint |
|---|---|
| `GET` | `/api/export/conversations/pdf` |
| `GET` | `/api/export/customers/excel` |

## /api/feedback

| Method | Endpoint |
|---|---|
| `POST` | `/api/feedback/auto-trigger` |
| `POST` | `/api/feedback/custom` |
| `GET` | `/api/feedback/custom/stats` |
| `GET` | `/api/feedback/customer/:customerId` |
| `POST` | `/api/feedback/nps` |
| `GET` | `/api/feedback/nps/stats` |
| `GET` | `/api/feedback/recent` |
| `POST` | `/api/feedback/request` |

## /api/files

| Method | Endpoint |
|---|---|
| `GET` | `/api/files` |
| `GET` | `/api/files/sections` |
| `POST` | `/api/files/seed` |
| `POST` | `/api/files/share` |

## /api/flows

| Method | Endpoint |
|---|---|
| `GET` | `/api/flows` |
| `POST` | `/api/flows` |
| `DELETE` | `/api/flows/:id` |
| `PUT` | `/api/flows/:id` |
| `PUT` | `/api/flows/:id/toggle` |
| `GET` | `/api/flows/node-types` |
| `GET` | `/api/flows/submissions` |
| `POST` | `/api/flows/test-node` |

## /api/followups

| Method | Endpoint |
|---|---|
| `POST` | `/api/followups/run` |

## /api/fulfillment

| Method | Endpoint |
|---|---|
| `GET` | `/api/fulfillment/tasks` |
| `POST` | `/api/fulfillment/tasks/:orderRef/deliver` |

## /api/gmail

| Method | Endpoint |
|---|---|
| `GET` | `/api/gmail/accounts` |
| `DELETE` | `/api/gmail/accounts/:id` |
| `POST` | `/api/gmail/accounts/:id/test` |
| `POST` | `/api/gmail/match-payments` |
| `GET` | `/api/gmail/oauth/callback` |
| `GET` | `/api/gmail/oauth/start` |
| `GET` | `/api/gmail/oauth/url` |
| `GET` | `/api/gmail/payment-matches` |
| `POST` | `/api/gmail/payment-parser-preview` |
| `GET` | `/api/gmail/payments` |
| `POST` | `/api/gmail/scan-payments` |
| `POST` | `/api/gmail/settings` |
| `GET` | `/api/gmail/status` |
| `POST` | `/api/gmail/test-all` |
| `GET` | `/api/gmail/test-setup` |

## /api/gpt-connector

| Method | Endpoint |
|---|---|
| `GET` | `/api/gpt-connector/status` |

## /api/group-finder

| Method | Endpoint |
|---|---|
| `GET` | `/api/group-finder/export` |
| `GET` | `/api/group-finder/links` |
| `POST` | `/api/group-finder/links` |
| `DELETE` | `/api/group-finder/links/:id` |
| `PUT` | `/api/group-finder/links/:id` |
| `POST` | `/api/group-finder/scan-text` |
| `POST` | `/api/group-finder/scan-url` |
| `POST` | `/api/group-finder/verify` |

## /api/group-prices

| Method | Endpoint |
|---|---|
| `GET` | `/api/group-prices` |
| `DELETE` | `/api/group-prices/:id` |
| `GET` | `/api/group-prices/stats` |

## /api/groups

| Method | Endpoint |
|---|---|
| `GET` | `/api/groups/:id/members/export` |
| `POST` | `/api/groups/:id/members/send` |
| `GET` | `/api/groups/analytics` |
| `GET` | `/api/groups/auto-replies` |
| `POST` | `/api/groups/auto-replies` |
| `DELETE` | `/api/groups/auto-replies/:id` |
| `PUT` | `/api/groups/auto-replies/:id` |
| `POST` | `/api/groups/auto-replies/:id/toggle` |
| `POST` | `/api/groups/broadcast` |
| `POST` | `/api/groups/broadcast-all` |
| `GET` | `/api/groups/broadcast-log` |
| `GET` | `/api/groups/distribution` |
| `POST` | `/api/groups/distribution/posts` |
| `DELETE` | `/api/groups/distribution/posts/:id` |
| `POST` | `/api/groups/distribution/posts/:id/send` |
| `POST` | `/api/groups/distribution/preview` |
| `GET` | `/api/groups/events` |
| `POST` | `/api/groups/events` |
| `PUT` | `/api/groups/events/:id` |
| `POST` | `/api/groups/fetch-post` |
| `GET` | `/api/groups/history/:groupId` |
| `GET` | `/api/groups/hot-signals` |
| `PUT` | `/api/groups/hot-signals/:id` |
| `GET` | `/api/groups/list` |
| `GET` | `/api/groups/member-tags` |
| `POST` | `/api/groups/member-tags` |
| `DELETE` | `/api/groups/member-tags/:id` |
| `POST` | `/api/groups/schedule` |
| `GET` | `/api/groups/top-active` |

## /api/handoffs

| Method | Endpoint |
|---|---|
| `GET` | `/api/handoffs` |
| `POST` | `/api/handoffs` |
| `PUT` | `/api/handoffs/:id` |

## /api/health

| Method | Endpoint |
|---|---|
| `GET` | `/api/health` |

## /api/hitl

| Method | Endpoint |
|---|---|
| `GET` | `/api/hitl/drafts` |
| `POST` | `/api/hitl/drafts` |
| `PUT` | `/api/hitl/drafts/:id` |

## /api/identity

| Method | Endpoint |
|---|---|
| `GET` | `/api/identity/lookup` |

## /api/import

| Method | Endpoint |
|---|---|
| `POST` | `/api/import/contacts-file` |
| `POST` | `/api/import/csv` |
| `POST` | `/api/import/csv/file` |
| `GET` | `/api/import/csv/template` |

## /api/imported-skills

| Method | Endpoint |
|---|---|
| `GET` | `/api/imported-skills/packs` |
| `POST` | `/api/imported-skills/plan` |
| `GET` | `/api/imported-skills/prompt` |
| `POST` | `/api/imported-skills/queue` |
| `GET` | `/api/imported-skills/status` |

## /api/inbox

| Method | Endpoint |
|---|---|
| `DELETE` | `/api/inbox` |
| `GET` | `/api/inbox` |
| `PUT` | `/api/inbox/:id/read` |
| `POST` | `/api/inbox/assign/:chatId` |
| `GET` | `/api/inbox/assignments` |
| `GET` | `/api/inbox/collision-risk` |
| `POST` | `/api/inbox/mark-read` |
| `GET` | `/api/inbox/presence` |
| `POST` | `/api/inbox/presence/:chatId` |
| `POST` | `/api/inbox/reply` |

## /api/integrations

| Method | Endpoint |
|---|---|
| `POST` | `/api/integrations/:type/test` |
| `GET` | `/api/integrations/directory` |
| `POST` | `/api/integrations/directory/:slug/toggle` |

## /api/invoice

| Method | Endpoint |
|---|---|
| `POST` | `/api/invoice/generate` |

## /api/invoices

| Method | Endpoint |
|---|---|
| `GET` | `/api/invoices` |
| `POST` | `/api/invoices/generate` |

## /api/issues

| Method | Endpoint |
|---|---|
| `GET` | `/api/issues` |
| `POST` | `/api/issues` |
| `DELETE` | `/api/issues/:id` |
| `POST` | `/api/issues/:id/reply` |
| `POST` | `/api/issues/:id/send-to-clickup` |
| `PUT` | `/api/issues/:id/status` |

## /api/journey-map

| Method | Endpoint |
|---|---|
| `GET` | `/api/journey-map` |

## /api/laptop-bot

| Method | Endpoint |
|---|---|
| `POST` | `/api/laptop-bot/clear` |
| `GET` | `/api/laptop-bot/conversation/:number` |
| `GET` | `/api/laptop-bot/conversations` |
| `POST` | `/api/laptop-bot/handle` |
| `POST` | `/api/laptop-bot/pause` |
| `POST` | `/api/laptop-bot/toggle` |

## /api/laptop-leads

| Method | Endpoint |
|---|---|
| `GET` | `/api/laptop-leads` |

## /api/launch-doctor

| Method | Endpoint |
|---|---|
| `GET` | `/api/launch-doctor` |

## /api/lead-lifecycle

| Method | Endpoint |
|---|---|
| `GET` | `/api/lead-lifecycle/summary` |

## /api/leads

| Method | Endpoint |
|---|---|
| `POST` | `/api/leads/:id/ai-followup` |
| `GET` | `/api/leads/analytics` |
| `POST` | `/api/leads/score` |

## /api/licenses

| Method | Endpoint |
|---|---|
| `GET` | `/api/licenses` |
| `GET` | `/api/licenses/:id` |
| `POST` | `/api/licenses/:id/reset` |
| `POST` | `/api/licenses/:id/revoke` |
| `POST` | `/api/licenses/generate` |

## /api/links

| Method | Endpoint |
|---|---|
| `GET` | `/api/links` |
| `POST` | `/api/links` |
| `DELETE` | `/api/links/:id` |
| `GET` | `/api/links/:id/clicks` |
| `GET` | `/api/links/hot-leads` |
| `POST` | `/api/links/hot-leads/:id/contacted` |

## /api/live-chats

| Method | Endpoint |
|---|---|
| `GET` | `/api/live-chats` |
| `GET` | `/api/live-chats/:number` |

## /api/logic-rules

| Method | Endpoint |
|---|---|
| `GET` | `/api/logic-rules` |
| `POST` | `/api/logic-rules` |
| `DELETE` | `/api/logic-rules/:id` |
| `POST` | `/api/logic-rules/evaluate` |

## /api/logs

| Method | Endpoint |
|---|---|
| `DELETE` | `/api/logs` |
| `GET` | `/api/logs` |
| `GET` | `/api/logs/export.csv` |

## /api/marketing

| Method | Endpoint |
|---|---|
| `POST` | `/api/marketing/messages` |
| `GET` | `/api/marketing/reach-report` |

## /api/mcp

| Method | Endpoint |
|---|---|
| `GET` | `/api/mcp/action-drafts` |
| `POST` | `/api/mcp/action-drafts` |
| `POST` | `/api/mcp/action-drafts/:id/approve` |
| `POST` | `/api/mcp/action-drafts/:id/reject` |

## /api/merge-fields

| Method | Endpoint |
|---|---|
| `GET` | `/api/merge-fields` |
| `POST` | `/api/merge-fields/preview` |

## /api/messenger

| Method | Endpoint |
|---|---|
| `GET` | `/api/messenger/inbox` |
| `POST` | `/api/messenger/send` |
| `GET` | `/api/messenger/status` |

## /api/n8n

| Method | Endpoint |
|---|---|
| `GET` | `/api/n8n/dashboard` |
| `GET` | `/api/n8n/events` |
| `GET` | `/api/n8n/status` |
| `POST` | `/api/n8n/test` |
| `POST` | `/api/n8n/webhook` |

## /api/orders

| Method | Endpoint |
|---|---|
| `GET` | `/api/orders` |
| `POST` | `/api/orders` |
| `DELETE` | `/api/orders/:id` |
| `GET` | `/api/orders/:id` |
| `PUT` | `/api/orders/:id` |
| `PUT` | `/api/orders/:id/status` |
| `POST` | `/api/orders/quick` |
| `GET` | `/api/orders/stats/summary` |

## /api/paperclip

| Method | Endpoint |
|---|---|
| `GET` | `/api/paperclip/status` |
| `POST` | `/api/paperclip/trigger` |

## /api/payments

| Method | Endpoint |
|---|---|
| `GET` | `/api/payments` |
| `POST` | `/api/payments` |
| `DELETE` | `/api/payments/:id` |
| `PUT` | `/api/payments/:id` |
| `POST` | `/api/payments/:id/approve` |

## /api/pc-agents

| Method | Endpoint |
|---|---|
| `POST` | `/api/pc-agents/autopilot` |
| `GET` | `/api/pc-agents/prompt` |
| `GET` | `/api/pc-agents/status` |
| `POST` | `/api/pc-agents/task` |

## /api/plans

| Method | Endpoint |
|---|---|
| `GET` | `/api/plans` |
| `POST` | `/api/plans` |
| `DELETE` | `/api/plans/:id` |
| `PUT` | `/api/plans/:id` |
| `POST` | `/api/plans/:id/announce` |
| `GET` | `/api/plans/broadcasts` |

## /api/platform

| Method | Endpoint |
|---|---|
| `GET` | `/api/platform/controls` |
| `POST` | `/api/platform/controls` |

## /api/polls

| Method | Endpoint |
|---|---|
| `GET` | `/api/polls` |
| `POST` | `/api/polls` |
| `GET` | `/api/polls/:id/results` |
| `POST` | `/api/polls/:id/send` |
| `POST` | `/api/polls/:id/vote` |

## /api/price-intel

| Method | Endpoint |
|---|---|
| `GET` | `/api/price-intel` |
| `POST` | `/api/price-intel` |
| `DELETE` | `/api/price-intel/:id` |
| `POST` | `/api/price-intel/:id/caption` |
| `GET` | `/api/price-intel/export.csv` |
| `POST` | `/api/price-intel/parse` |
| `POST` | `/api/price-intel/sweep` |

## /api/price-monitors

| Method | Endpoint |
|---|---|
| `GET` | `/api/price-monitors` |
| `POST` | `/api/price-monitors` |
| `DELETE` | `/api/price-monitors/:id` |
| `POST` | `/api/price-monitors/run` |

## /api/privacy

| Method | Endpoint |
|---|---|
| `GET` | `/api/privacy/controls` |
| `POST` | `/api/privacy/controls` |
| `GET` | `/api/privacy/status` |

## /api/products

| Method | Endpoint |
|---|---|
| `GET` | `/api/products` |
| `POST` | `/api/products` |
| `DELETE` | `/api/products/:id` |
| `PUT` | `/api/products/:id` |
| `POST` | `/api/products/:id/bulk-send` |
| `POST` | `/api/products/:id/send` |
| `PUT` | `/api/products/:id/stock` |
| `GET` | `/api/products/bulk-sends` |
| `GET` | `/api/products/by-category/:category` |
| `POST` | `/api/products/import-store` |
| `POST` | `/api/products/rss` |
| `POST` | `/api/products/rss-import-v2` |
| `GET` | `/api/products/stats` |

## /api/project

| Method | Endpoint |
|---|---|
| `GET` | `/api/project/antigravity-next-50` |
| `GET` | `/api/project/completion-report` |

## /api/project-agent

| Method | Endpoint |
|---|---|
| `POST` | `/api/project-agent/run` |
| `GET` | `/api/project-agent/status` |
| `PATCH` | `/api/project-agent/tasks/:id` |

## /api/quick-replies

| Method | Endpoint |
|---|---|
| `GET` | `/api/quick-replies` |
| `POST` | `/api/quick-replies` |
| `DELETE` | `/api/quick-replies/:id` |
| `GET` | `/api/quick-replies/:id` |
| `PUT` | `/api/quick-replies/:id` |
| `POST` | `/api/quick-replies/:id/send` |
| `POST` | `/api/quick-replies/:id/use` |
| `POST` | `/api/quick-replies/bulk` |
| `GET` | `/api/quick-replies/most-used` |

## /api/reminders

| Method | Endpoint |
|---|---|
| `GET` | `/api/reminders` |
| `POST` | `/api/reminders` |
| `DELETE` | `/api/reminders/:id` |
| `PUT` | `/api/reminders/:id` |
| `POST` | `/api/reminders/:id/done` |

## /api/reply-speed

| Method | Endpoint |
|---|---|
| `GET` | `/api/reply-speed/queue` |
| `GET` | `/api/reply-speed/summary` |

## /api/reports

| Method | Endpoint |
|---|---|
| `POST` | `/api/reports/daily-sales/send` |
| `GET` | `/api/reports/detailed` |
| `GET` | `/api/reports/export` |

## /api/retargeting

| Method | Endpoint |
|---|---|
| `GET` | `/api/retargeting/campaigns` |
| `POST` | `/api/retargeting/run` |

## /api/reviews

| Method | Endpoint |
|---|---|
| `GET` | `/api/reviews` |
| `POST` | `/api/reviews` |
| `DELETE` | `/api/reviews/:id` |
| `PUT` | `/api/reviews/:id` |
| `GET` | `/api/reviews/stats` |

## /api/safety

| Method | Endpoint |
|---|---|
| `GET` | `/api/safety/logs` |
| `POST` | `/api/safety/opt-out` |
| `DELETE` | `/api/safety/opt-out/:number` |
| `GET` | `/api/safety/settings` |
| `PUT` | `/api/safety/settings` |
| `GET` | `/api/safety/status` |
| `POST` | `/api/safety/validate` |
| `GET` | `/api/safety/warmup-guide` |

## /api/sales-activation

| Method | Endpoint |
|---|---|
| `POST` | `/api/sales-activation/conversion` |
| `POST` | `/api/sales-activation/draft` |
| `GET` | `/api/sales-activation/preview` |

## /api/scheduled-messages

| Method | Endpoint |
|---|---|
| `GET` | `/api/scheduled-messages` |
| `POST` | `/api/scheduled-messages` |
| `DELETE` | `/api/scheduled-messages/:id` |
| `PUT` | `/api/scheduled-messages/:id` |

## /api/scholarship-pipeline

| Method | Endpoint |
|---|---|
| `GET` | `/api/scholarship-pipeline` |
| `POST` | `/api/scholarship-pipeline/capture` |
| `POST` | `/api/scholarship-pipeline/fetch` |
| `GET` | `/api/scholarship-pipeline/logs` |
| `POST` | `/api/scholarship-pipeline/publish` |
| `POST` | `/api/scholarship-pipeline/settings` |
| `GET` | `/api/scholarship-pipeline/sources` |
| `POST` | `/api/scholarship-pipeline/sources` |
| `DELETE` | `/api/scholarship-pipeline/sources/:id` |
| `POST` | `/api/scholarship-pipeline/sweep` |

## /api/scraping-agent

| Method | Endpoint |
|---|---|
| `GET` | `/api/scraping-agent/blueprints` |
| `POST` | `/api/scraping-agent/extract` |
| `GET` | `/api/scraping-agent/jobs` |
| `POST` | `/api/scraping-agent/jobs` |
| `POST` | `/api/scraping-agent/jobs/:id/run` |
| `GET` | `/api/scraping-agent/prompt` |
| `GET` | `/api/scraping-agent/status` |

## /api/search

| Method | Endpoint |
|---|---|
| `GET` | `/api/search` |
| `GET` | `/api/search/customers` |
| `GET` | `/api/search/messages` |
| `POST` | `/api/search/rebuild` |
| `GET` | `/api/search/stats` |
| `GET` | `/api/search/suggestions` |

## /api/seller-rates

| Method | Endpoint |
|---|---|
| `GET` | `/api/seller-rates` |
| `GET` | `/api/seller-rates/best` |
| `GET` | `/api/seller-rates/export.csv` |
| `GET` | `/api/seller-rates/groups` |
| `GET` | `/api/seller-rates/profiles` |
| `GET` | `/api/seller-rates/report.md` |
| `GET` | `/api/seller-rates/summary` |
| `POST` | `/api/seller-rates/sweep` |

## /api/sequences

| Method | Endpoint |
|---|---|
| `GET` | `/api/sequences` |
| `POST` | `/api/sequences` |
| `DELETE` | `/api/sequences/:id` |
| `PUT` | `/api/sequences/:id` |

## /api/settings

| Method | Endpoint |
|---|---|
| `GET` | `/api/settings` |
| `POST` | `/api/settings` |

## /api/sla

| Method | Endpoint |
|---|---|
| `POST` | `/api/sla/policy` |
| `GET` | `/api/sla/status` |

## /api/social

| Method | Endpoint |
|---|---|
| `GET` | `/api/social/accounts` |
| `POST` | `/api/social/accounts` |
| `DELETE` | `/api/social/accounts/:id` |
| `PUT` | `/api/social/accounts/:id` |
| `POST` | `/api/social/app-credentials` |
| `GET` | `/api/social/auto-poster/jobs` |
| `POST` | `/api/social/auto-poster/jobs` |
| `DELETE` | `/api/social/auto-poster/jobs/:id` |
| `POST` | `/api/social/auto-poster/jobs/:id/retry` |
| `POST` | `/api/social/auto-poster/run` |
| `POST` | `/api/social/auto-poster/scan` |
| `GET` | `/api/social/auto-poster/status` |
| `POST` | `/api/social/comment` |
| `GET` | `/api/social/comments` |
| `GET` | `/api/social/events` |
| `GET` | `/api/social/oauth/:platform/callback` |
| `GET` | `/api/social/oauth/urls` |
| `GET` | `/api/social/posts` |
| `POST` | `/api/social/publish` |
| `GET` | `/api/social/status` |
| `POST` | `/api/social/test/:platform` |

## /api/stock-sourcing

| Method | Endpoint |
|---|---|
| `GET` | `/api/stock-sourcing` |
| `POST` | `/api/stock-sourcing` |
| `POST` | `/api/stock-sourcing/:code/approve` |
| `POST` | `/api/stock-sourcing/:code/reject` |

## /api/student-website

| Method | Endpoint |
|---|---|
| `GET` | `/api/student-website/config` |
| `POST` | `/api/student-website/config` |
| `GET` | `/api/student-website/diagnose` |
| `GET` | `/api/student-website/logs` |
| `POST` | `/api/student-website/lookup` |
| `GET` | `/api/student-website/readiness` |

## /api/subscriptions

| Method | Endpoint |
|---|---|
| `POST` | `/api/subscriptions/checkout` |

## /api/supervision

| Method | Endpoint |
|---|---|
| `GET` | `/api/supervision/summary` |

## /api/system

| Method | Endpoint |
|---|---|
| `POST` | `/api/system/setup-autofix` |
| `GET` | `/api/system/setup-validator` |

## /api/template

| Method | Endpoint |
|---|---|
| `GET` | `/api/template/categories` |

## /api/template-approvals

| Method | Endpoint |
|---|---|
| `GET` | `/api/template-approvals` |
| `POST` | `/api/template-approvals` |
| `PUT` | `/api/template-approvals/:id` |

## /api/templates

| Method | Endpoint |
|---|---|
| `GET` | `/api/templates` |
| `POST` | `/api/templates` |
| `DELETE` | `/api/templates/:templateId` |
| `GET` | `/api/templates/:templateId` |
| `PUT` | `/api/templates/:templateId` |
| `POST` | `/api/templates/:templateId/render` |
| `GET` | `/api/templates/category/:category` |
| `POST` | `/api/templates/generate` |
| `POST` | `/api/templates/render-preview` |

## /api/text

| Method | Endpoint |
|---|---|
| `GET` | `/api/text/unicode-repair/preview` |
| `POST` | `/api/text/unicode-repair/run` |

## /api/tools

| Method | Endpoint |
|---|---|
| `POST` | `/api/tools/dedupe-numbers` |
| `POST` | `/api/tools/extract-product` |
| `POST` | `/api/tools/interactive-preview` |
| `POST` | `/api/tools/merge-field-preview` |
| `POST` | `/api/tools/number-filter` |
| `POST` | `/api/tools/number-generator` |
| `POST` | `/api/tools/number-validate` |
| `POST` | `/api/tools/text-rotation-preview` |

## /api/update

| Method | Endpoint |
|---|---|
| `POST` | `/api/update/check` |
| `GET` | `/api/update/status` |

## /api/upload

| Method | Endpoint |
|---|---|
| `POST` | `/api/upload` |

## /api/wa

| Method | Endpoint |
|---|---|
| `GET` | `/api/wa/accounts` |
| `POST` | `/api/wa/accounts` |
| `POST` | `/api/wa/accounts/:id/connect` |
| `POST` | `/api/wa/accounts/:id/disconnect` |
| `GET` | `/api/wa/accounts/:id/qr` |
| `POST` | `/api/wa/accounts/:id/reset` |
| `GET` | `/api/wa/accounts/:id/status` |
| `POST` | `/api/wa/accounts/settings` |
| `GET` | `/api/wa/admin-commands` |
| `POST` | `/api/wa/auto-fetch` |
| `GET` | `/api/wa/automation-settings` |
| `POST` | `/api/wa/automation-settings` |
| `GET` | `/api/wa/automation-settings/client-pack` |
| `POST` | `/api/wa/automation-settings/client-pack` |
| `GET` | `/api/wa/automation-settings/onboarding` |
| `POST` | `/api/wa/automation-settings/onboarding` |
| `POST` | `/api/wa/automation-settings/preset` |
| `POST` | `/api/wa/automation-settings/test-reply` |
| `POST` | `/api/wa/channel-publisher/connect` |
| `GET` | `/api/wa/channel-publisher/qr` |
| `POST` | `/api/wa/channel-publisher/reset` |
| `GET` | `/api/wa/channel-publisher/status` |
| `GET` | `/api/wa/channels` |
| `POST` | `/api/wa/channels` |
| `GET` | `/api/wa/channels/activity` |
| `GET` | `/api/wa/channels/addons` |
| `POST` | `/api/wa/channels/addons` |
| `POST` | `/api/wa/channels/autofix` |
| `POST` | `/api/wa/channels/automation` |
| `GET` | `/api/wa/channels/automation-pack` |
| `POST` | `/api/wa/channels/automation-pack` |
| `POST` | `/api/wa/channels/automation-pack/run` |
| `POST` | `/api/wa/channels/automation/fast-mode` |
| `GET` | `/api/wa/channels/automation/health` |
| `POST` | `/api/wa/channels/automation/run-max` |
| `POST` | `/api/wa/channels/automation/run-now` |
| `GET` | `/api/wa/channels/automation/status` |
| `POST` | `/api/wa/channels/boost` |
| `GET` | `/api/wa/channels/bridge-health` |
| `GET` | `/api/wa/channels/command-center` |
| `GET` | `/api/wa/channels/conditional-rules` |
| `POST` | `/api/wa/channels/conditional-rules` |
| `DELETE` | `/api/wa/channels/conditional-rules/:id` |
| `POST` | `/api/wa/channels/configure-discovered` |
| `GET` | `/api/wa/channels/content-library` |
| `POST` | `/api/wa/channels/control` |
| `GET` | `/api/wa/channels/copy` |
| `POST` | `/api/wa/channels/copy/automation` |
| `POST` | `/api/wa/channels/copy/sources` |
| `POST` | `/api/wa/channels/copy/sweep` |
| `GET` | `/api/wa/channels/discover` |
| `POST` | `/api/wa/channels/discover` |
| `POST` | `/api/wa/channels/drip/run` |
| `POST` | `/api/wa/channels/gap-filler/run` |
| `POST` | `/api/wa/channels/jobs` |
| `DELETE` | `/api/wa/channels/jobs/:id` |
| `PUT` | `/api/wa/channels/jobs/:id` |
| `POST` | `/api/wa/channels/jobs/:id/run` |
| `GET` | `/api/wa/channels/manual-packets` |
| `POST` | `/api/wa/channels/manual-packets/:id/done` |
| `POST` | `/api/wa/channels/media-pipeline` |
| `DELETE` | `/api/wa/channels/media-pipeline/:id` |
| `GET` | `/api/wa/channels/posts` |
| `POST` | `/api/wa/channels/posts` |
| `DELETE` | `/api/wa/channels/posts/:id` |
| `PUT` | `/api/wa/channels/posts/:id` |
| `POST` | `/api/wa/channels/posts/:id/send` |
| `POST` | `/api/wa/channels/preset` |
| `POST` | `/api/wa/channels/preview` |
| `GET` | `/api/wa/channels/queue-cleaner` |
| `POST` | `/api/wa/channels/queue-cleaner/run` |
| `GET` | `/api/wa/channels/relay` |
| `POST` | `/api/wa/channels/relay` |
| `DELETE` | `/api/wa/channels/relay/:id` |
| `PUT` | `/api/wa/channels/relay/:id` |
| `POST` | `/api/wa/channels/relay/:id/send` |
| `POST` | `/api/wa/channels/relay/reorder` |
| `POST` | `/api/wa/channels/share` |
| `POST` | `/api/wa/channels/share-facebook` |
| `POST` | `/api/wa/channels/share-source` |
| `GET` | `/api/wa/channels/source-doctor` |
| `POST` | `/api/wa/channels/source-doctor/run` |
| `GET` | `/api/wa/channels/source-intelligence` |
| `POST` | `/api/wa/channels/source-intelligence` |
| `POST` | `/api/wa/channels/source-links` |
| `GET` | `/api/wa/channels/sources` |
| `POST` | `/api/wa/channels/sources/toggle` |
| `GET` | `/api/wa/channels/templates` |
| `POST` | `/api/wa/channels/templates` |
| `GET` | `/api/wa/channels/watchdog` |
| `POST` | `/api/wa/channels/watchdog` |
| `GET` | `/api/wa/chat-control/:id` |
| `POST` | `/api/wa/chat-control/:id` |
| `POST` | `/api/wa/chat-control/:id/handoff` |
| `POST` | `/api/wa/chat-control/:id/resume-ai` |
| `POST` | `/api/wa/chat-control/:id/resume-bot` |
| `POST` | `/api/wa/chat-control/:id/stop-ai` |
| `POST` | `/api/wa/chat-control/:id/stop-bot` |
| `DELETE` | `/api/wa/chat-message` |
| `GET` | `/api/wa/chat/:id` |
| `POST` | `/api/wa/chat/:id` |
| `GET` | `/api/wa/chats` |
| `POST` | `/api/wa/connect` |
| `GET` | `/api/wa/contact/:id` |
| `GET` | `/api/wa/contacts` |
| `POST` | `/api/wa/contacts/reply` |
| `GET` | `/api/wa/conversations` |
| `GET` | `/api/wa/diagnostics` |
| `POST` | `/api/wa/disconnect` |
| `POST` | `/api/wa/group-announce` |
| `GET` | `/api/wa/group/:id/participants` |
| `POST` | `/api/wa/pairing-code` |
| `GET` | `/api/wa/qr` |
| `POST` | `/api/wa/recover` |
| `POST` | `/api/wa/reset` |
| `POST` | `/api/wa/send` |
| `POST` | `/api/wa/send-audio` |
| `POST` | `/api/wa/send-bulk-parallel` |
| `POST` | `/api/wa/send-button` |
| `POST` | `/api/wa/send-carousel` |
| `POST` | `/api/wa/send-contact` |
| `POST` | `/api/wa/send-document` |
| `POST` | `/api/wa/send-list` |
| `POST` | `/api/wa/send-location` |
| `POST` | `/api/wa/send-media` |
| `POST` | `/api/wa/send-official` |
| `POST` | `/api/wa/send-status` |
| `POST` | `/api/wa/send-unknown` |
| `POST` | `/api/wa/send-vcf` |
| `POST` | `/api/wa/send-voice` |
| `GET` | `/api/wa/status` |

## /api/watchdog

| Method | Endpoint |
|---|---|
| `POST` | `/api/watchdog/check` |
| `POST` | `/api/watchdog/settings` |
| `GET` | `/api/watchdog/status` |

## /api/web-bridge

| Method | Endpoint |
|---|---|
| `POST` | `/api/web-bridge/fetch` |
| `POST` | `/api/web-bridge/fetch-forward` |
| `POST` | `/api/web-bridge/forward` |
| `GET` | `/api/web-bridge/logs` |

## /api/web-intel

| Method | Endpoint |
|---|---|
| `POST` | `/api/web-intel/deals` |
| `POST` | `/api/web-intel/extract` |
| `POST` | `/api/web-intel/scholarships` |
| `POST` | `/api/web-intel/search` |
| `GET` | `/api/web-intel/status` |

## /api/webhook

| Method | Endpoint |
|---|---|
| `POST` | `/api/webhook/incoming` |

## /api/webhooks

| Method | Endpoint |
|---|---|
| `GET` | `/api/webhooks` |
| `POST` | `/api/webhooks` |
| `DELETE` | `/api/webhooks/:id` |
| `PUT` | `/api/webhooks/:id` |
| `POST` | `/api/webhooks/:id/test` |
| `GET` | `/api/webhooks/events` |
| `GET` | `/api/webhooks/logs` |
| `POST` | `/api/webhooks/test` |

## /api/whatsapp

| Method | Endpoint |
|---|---|
| `GET` | `/api/whatsapp/automation-settings` |
| `POST` | `/api/whatsapp/automation-settings` |

## /api/whatsapp-cloud

| Method | Endpoint |
|---|---|
| `POST` | `/api/whatsapp-cloud/send-template` |
| `POST` | `/api/whatsapp-cloud/send-text` |
| `POST` | `/api/whatsapp-cloud/settings` |
| `GET` | `/api/whatsapp-cloud/status` |
| `GET` | `/api/whatsapp-cloud/webhook` |
| `POST` | `/api/whatsapp-cloud/webhook` |

## /api/whatsapp-forms

| Method | Endpoint |
|---|---|
| `GET` | `/api/whatsapp-forms` |
| `POST` | `/api/whatsapp-forms` |
| `DELETE` | `/api/whatsapp-forms/:id` |
| `POST` | `/api/whatsapp-forms/:id/send` |
| `GET` | `/api/whatsapp-forms/:id/submissions` |
| `POST` | `/api/whatsapp-forms/:id/submit` |

## /api/workflows

| Method | Endpoint |
|---|---|
| `GET` | `/api/workflows` |
| `POST` | `/api/workflows` |
| `DELETE` | `/api/workflows/:workflowId` |
| `GET` | `/api/workflows/:workflowId` |
| `PUT` | `/api/workflows/:workflowId` |
| `POST` | `/api/workflows/:workflowId/execute` |
| `GET` | `/api/workflows/stats` |
