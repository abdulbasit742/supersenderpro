# Group Commerce OS

A coordination layer that turns WhatsApp groups into mini commerce marketplaces.
It does NOT replace any existing system; it reuses the bot, ecommerce, dealer
intelligence, AI agents, SuperFlow Studio, and social/channel features.

## What it adds
- Per-group registry (settings, modes, masked admins)
- Admin command router (/help, /status, /pause, /catalog, /agent, /relay, ...)
- Message moderation (links, spam, scam-like, price-without-SKU) — dry-run
- Seller/buyer/SKU intelligence analyzer
- Per-group catalogue built from detected offers
- Ecommerce<->group sync PREVIEWS (no live writes)
- Group<->social/channel relay DRAFTS (no live posts)
- Per-group AI agent assignment (suggest-only)
- SuperFlow Studio trigger/action node entries (no new builder)
- Per-group pause controls with auto-resume

## Endpoints
Mounted at `/api/group-commerce` (see routes/groupCommerceRoutes.js). Dashboard at `/group-commerce`.

## Storage
JSON files: `data/group-commerce.json` and `data/group-commerce-history.json`.
No DB required. App runs even if files are missing. Phone numbers are masked.

## Safety
Everything risky is dry-run by default. Live behavior requires explicit env flags
(see docs/GROUP_COMMERCE_SAFETY.md). build()/send paths never fire without them.


## Integration points (no duplication)
- SuperFlow: import TRIGGERS/ACTIONS from lib/groupCommerce/flowNodes.js
- Ecommerce: ecommerceBridge.js returns drafts; wire to your real ecommerce read APIs
- AI agents: agentRegistry.js assigns EXISTING agents, doesn't create a runtime
- Channels/social: relayPlanner.js returns drafts; wire to your existing senders (gated)
