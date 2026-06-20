# Unified Setup — Gap Report

**Repo:** abdulbasit742/supersenderpro · **Scan date:** 2026-06-20

## 1. Existing setup-related modules (NOT rebuilt — only connected)
| Area | Status | Decision |
|---|---|---|
| Admin auth / RBAC | exists | connect via connector |
| Security scan (`scripts/secret-scan.js`) | exists | connect |
| Launch center (`scripts/launch-readiness.js`, `public-launch-check.js`) | exists | connect |
| WhatsApp local (`wa-sales-bot`) | exists | connect |
| WhatsApp Cloud (`watiBroadcast`, `routes/wati.js`) | exists | connect |
| Ecommerce (`storeBuilder`, `productBotEngine`, `store.html`) | exists | connect |
| Payments (`txnStore`) | exists | connect |
| Social (`adsManager`, `routes/ads.js`) | exists | connect |
| AI providers (`aiAgent`, `storeAIAgent`) | exists | connect |
| Voice AI (`lib/voiceAI`, `voice-ai.html`) | exists | connect |
| Channel Automation (`channelAutomationCenter`) | exists | connect |
| Marketplace Intelligence (`marketplaceIntelligence`) | exists | connect |
| Customer 360 (`storeCRM`, `kommoCRM`, `leadScoring`) | exists | connect |
| AI Agent Deployment (`agent-runtime`) | exists | connect |

## 2. Missing (now built)
The **unified setup / tenant onboarding coordination layer** was missing. No `lib/unifiedSetup`,
no setup validator, no tenant registry coordination, no unified readiness report. All built fresh
as an inspect-only coordination layer (`lib/unifiedSetup/`) that connects to the modules above
**without rebuilding any of them**.

## 3. Risk flags
- **duplicate_risk:** none.
- **live_action_risk:** none — connectors only inspect file presence + env-var names; no module is
  imported/run, no external API is called, no live data is written. Dry-run by default.
- **needs_manual_credentials:** WhatsApp Cloud, Meta/LinkedIn/TikTok, Payments IMAP, AI provider keys, Voice keys.
