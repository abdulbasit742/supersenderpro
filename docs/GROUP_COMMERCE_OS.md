# Group Commerce OS Architecture Documentation

## 1. Overview
Group Commerce OS is an orchestrator layer built for SuperSender Pro. It is specifically designed to convert standard chat channels (like WhatsApp groups, Telegram channels, and Facebook communities) into high-fidelity mini-marketplaces with zero friction.

By serving as a coordinated middleware, Group Commerce OS bridges:
- Live Group Conversations (monitored via Baileys)
- Admin Governance / Chat commands
- Structured Product Catalogs (per group)
- AI Agent Workforces (Specialized personas)
- E-commerce Gateways (WooCommerce/Shopify)
- Cross-Platform Relay Planners (Broadcasting & Channels)

```
       [ WhatsApp Group ] ◄═════════► [ Baileys Client / Bot Handler ]
              ▲
              │ (Incoming Message / Command)
              ▼
    ┌────────────────────────────────────────────────────────┐
    │                 GROUP COMMERCE OS LAYER                │
    ├────────────────────────────────────────────────────────┤
    │  - Group Registry (Group configurations & settings)   │
    │  - Moderation Shield (Banned URL blocks, spam guards)  │
    │  - Intent Analyzer (Seller, Buyer, & SKU parsing)      │
    │  - AI Persona Assigner (Sales, Support, Catalogs)      │
    │  - Pause Manager (Temporary 5-10m mute holds)          │
    │  - Virtual Group Catalogs (SKUs, pricing, trust logs)  │
    └────────────────════════╦═══════════════════════════════┘
                             │ (Dry-Run / Safe Drafts)
                             ▼
    ┌────────────────────────────────────────────────────────┐
    │    E-Commerce Gateways   |   Social / Channel Relays    |
    │     (Draft Products/Orders)|   (FB, Insta, Channels)    |
    └────────────────────────────────════════════════════════┘
```

---

## 2. File Architecture

The codebase is organized cleanly as a CommonJS modular system, adhering to standard Node.js structures:

*   `lib/groupCommerce/store.js`: Data persistence layer using secure JSON storage with integrated phone, email, and transaction masking.
*   `lib/groupCommerce/groupRegistry.js`: Repository tracking connected groups, allowed commands, tenant links, and active modes.
*   `lib/groupCommerce/pauseManager.js`: Mute/Delay controls managing temporary AI silence timers (5-10m).
*   `lib/groupCommerce/commandRouter.js`: Command router mapping administrative triggers (e.g. `/status`, `/rules`, `/pause`) and executing mock validations.
*   `lib/groupCommerce/messageAnalyzer.js`: Natural Language parsing heuristics extracting seller lists, buyer intents, quantities, SKUs, and pricing ranges.
*   `lib/groupCommerce/catalog.js`: Per-group virtual store logs mapping live listings, min/max prices, and trusted vendors.
*   `lib/groupCommerce/ecommerceBridge.js`: Draft mapper building synchronization previews for external shopping pipelines.
*   `lib/groupCommerce/relayPlanner.js`: Multi-platform publisher planning draft posts for Channels and pages.
*   `lib/groupCommerce/agentRegistry.js`: Evaluates group contexts using specialized agents (Closer, Sentinel, Curator).
*   `lib/groupCommerce/flowNodes.js`: Definition nodes for triggers/actions integration in visual flow designers.
*   `routes/groupCommerceRoutes.js`: Complete Express REST API endpoints matching specifications.

---

## 3. API Catalog Reference

All endpoints are hosted relative to the prefix `/api/group-commerce`:

| Method | Endpoint | Description | Payload Sample / Query |
| --- | --- | --- | --- |
| **GET** | `/status` | General system configuration settings and dry-run boundaries. | N/A |
| **GET** | `/groups` | Return all registered group settings. | N/A |
| **POST** | `/groups` | Register a new group into the OS Registry. | `{ "groupId": "grp-1", "groupName": "Accessories" }` |
| **GET** | `/groups/:id` | Get specific registry details for a single group. | N/A |
| **PUT** | `/groups/:id` | Update parameters (commerceMode, moderationMode). | `{ "commerceMode": false }` |
| **POST** | `/groups/:id/command` | Run a chat command from group admins. | `{ "sender": "+923001234567", "command": "/rules" }` |
| **POST** | `/groups/:id/analyze-message` | Run NLP extraction metrics against chat text. | `{ "messageText": "iPhone 13 RS 145k avail" }` |
| **GET** | `/groups/:id/catalog` | List the virtual catalog for a group. | N/A |
| **POST** | `/groups/:id/catalog` | Manually write/adjust item details in catalog. | `{ "sku": "SKU-IPH13", "latestPrice": 145000 }` |
| **POST** | `/groups/:id/ecommerce-preview` | Generate draft orders or catalog exports. | `{ "type": "create_order", "payload": { ... } }` |
| **POST** | `/groups/:id/relay-preview` | Plan cross-platform forwarding messages. | `{ "type": "market_digest" }` |
| **GET** | `/agents` | List available specialized AI Persona roles. | N/A |
| **POST** | `/groups/:id/agents` | Evaluate group prompts with assigned AI agent. | `{ "agentId": "sales", "messageText": "is iPad in stock?" }` |
| **GET** | `/history` | Fetch secure, masked audit logs. | N/A |

---

## 4. Flow Builder (SuperFlow) Integration

For the Visual Flow Studio (`docs/superflow-studio.md`), Group Commerce OS integrates as standard triggers and actions nodes:

### Triggers
- `group_message_received`: Fires on any incoming community chat.
- `seller_offer_detected`: Triggers when seller intent & SKU are parsed.
- `buyer_request_detected`: Triggers on client buying queries.
- `sku_price_changed`: Triggers when a vendor updates SKU price ranges.
- `banned_link_detected`: Fires when an unapproved external URL is found.

### Actions
- `create_group_catalog_post`: Formulates a WhatsApp formatting post.
- `create_channel_post_draft`: Drafts channel announcements.
- `create_order_draft`: Builds order drafts inside WooCommerce/CRM pipelines.
- `notify_admin`: Flags high-value matches or policy breaches to owners.
- `pause_group_ai`: Suspends AI automated actions per group.
