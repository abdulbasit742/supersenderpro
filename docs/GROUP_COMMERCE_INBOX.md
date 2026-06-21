  # Group Commerce Inbox + Market Intelligence

  An operational layer **on top of the existing Group Commerce OS**. It gives admins one place to see seller offers, buyer
  requests, SKU/price/stock signals, moderation flags, suspicious posts, and AI-suggested next steps, plus a cross-group
  market summary. It is **dry-run and preview-only**.

  > It does NOT rebuild Group Commerce OS, adapters, WhatsApp, ecommerce, social, channels, AI agents, payments, CRM, n8n,
  Sheets, or reporting. It reads already-analyzed events and normalizes them.

  ## What the inbox does
  - Aggregates analyzed group commerce events into one normalized record shape.
  - Filters/searches/sorts by group, type, SKU, product, seller, buyer, risk, confidence, date, and more.
  - Computes a market summary (top products/SKUs, latest/min/max price per SKU, demand, stock, suspicious counts,
  opportunities).
  - Produces dry-run action suggestions (drafts only).

  ## Normalized record shape

{ id, groupId, groupName, type, roleIntent, productName, sku, quantity, price, currency,
stockStatus, sellerIdMasked, buyerIdMasked, confidence, riskLevel, flags,
suggestedActions, sourcePreview, resolved, createdAt, updatedAt }
  ## Supported item types
  `seller_offer`, `buyer_request`, `price_update`, `stock_update`, `catalog_update`, `moderation_flag`, `suspicious_post`,
  `admin_command`, `ai_suggestion`, `relay_opportunity`, `ecommerce_opportunity`.

  ## Filtering & search
  By group, type, roleIntent, SKU, product, seller, buyer, risk level, confidence range, date range, unresolved only, high-
  value only, suspicious only, free-text query. Sorts: newest, oldest, highest/lowest price, highest confidence, highest
  risk.


  ## Market summary
  Top products/SKUs/sellers (masked) by mentions, latest/min/max price per SKU, in-stock vs out-of-stock counts, buyer
  demand count, suspicious post count, per-group activity, and suggested opportunities. Computed from local data only, no
  external calls.


  ## Action suggestions (dry-run drafts)
  create catalogue draft, create order draft, WhatsApp group reply draft, WhatsApp channel post draft, social post draft,
  notify admin draft, assign AI agent draft, pause group AI draft, warn seller draft, mark as resolved. None of these
  send/post/delete/write. Live execution later must go through the existing adapter layer.

  ## Dry-run safety
  - `GROUP_COMMERCE_INBOX_DRY_RUN=true` by default.
  - `GROUP_COMMERCE_INBOX_AUTO_ACTIONS=false` by default; the inbox never auto-executes.
  - No WhatsApp/channel/social sends, no ecommerce/order/product writes, no payment approvals, no deletes, no user removal.

  ## What is NOT stored

  - Full raw message bodies (unless `GROUP_COMMERCE_INBOX_STORE_RAW=true`, off by default), only a short sanitized
  `sourcePreview`.
  - Full phone numbers or emails: masked at the store layer.
  - No tokens/secrets.

  ## API
  - `GET /api/group-commerce/inbox/status`
  - `GET /api/group-commerce/inbox/items`
  - `POST /api/group-commerce/inbox/items`
  - `GET /api/group-commerce/inbox/items/:id`
  - `PUT /api/group-commerce/inbox/items/:id`
  - `DELETE /api/group-commerce/inbox/items/:id`
  - `POST /api/group-commerce/inbox/ingest`
  - `POST /api/group-commerce/inbox/search`
  - `GET /api/group-commerce/inbox/summary`
  - `POST /api/group-commerce/inbox/items/:id/suggest-actions`
  - `POST /api/group-commerce/inbox/items/:id/resolve`

  ## How to test

node --check lib/groupCommerce/inbox/store.js
node --check lib/groupCommerce/inbox/aggregator.js
node --check lib/groupCommerce/inbox/filters.js
node --check lib/groupCommerce/inbox/marketSummary.js
node --check lib/groupCommerce/inbox/actionSuggestions.js
node --check routes/groupCommerceInboxRoutes.js
node --check tests/smoke/groupCommerceInboxSmoke.js
npm run group-commerce:inbox:smoke
  ## Connecting later to existing systems (safely)
  The inbox is a read/normalize surface. To act on a suggestion, route it through the EXISTING adapter layer
  (`lib/groupCommerce/adapters/*`), which already enforces dry-run + masking and is gated by its own env flags. The inbox
  should never call WhatsApp/ecommerce/social directly. Wire ingestion from your existing message pipeline by POSTing
  analyzed output (e.g. from `messageAnalyzer.analyze`) to `/ingest`.

  ## Do not commit
  - `data/group-commerce-inbox.json` (local runtime data). Add to `.gitignore`.
