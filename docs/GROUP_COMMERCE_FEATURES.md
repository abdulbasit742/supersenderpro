# Group Commerce OS — Advanced Feature Modules

This document covers the advanced intelligence modules added on top of the core Group Commerce OS coordination layer. All actions remain dry-run safe by default.

## 1. Buyer ↔ Seller Matching Engine
**File:** `lib/groupCommerce/matchingEngine.js`

Automatically matches a buyer request (free text or structured intent) against the active seller catalog of a group. Scores each candidate by SKU match, product-name fuzzy match, stock availability, and budget fit.

**API:** `POST /api/group-commerce/groups/:id/match`
```json
{ "buyerRequest": "need iPhone 13 1 pcs under 150k" }
```
Returns ranked matches with `matchScore` (0–1) and human-readable `reasons`.

## 2. Price Intelligence
**File:** `lib/groupCommerce/priceIntelligence.js`

Computes price spread, price position (0 = cheapest seen, 100 = most expensive), and a buy/wait signal per SKU.

**APIs:**
- `GET /api/group-commerce/groups/:id/price-intel/:sku` — per-SKU price analytics & signal (`good_buy` / `stable` / `overpriced`).
- `GET /api/group-commerce/groups/:id/market-overview` — aggregate stats: total SKUs, total stock, inventory value, out-of-stock count, cheapest & priciest items.

## 3. Seller Trust Leaderboard
**File:** `lib/groupCommerce/leaderboard.js`

Ranks verified sellers by a trust score derived from listing count and available stock. Seller phone numbers are masked before output.

**API:** `GET /api/group-commerce/groups/:id/leaderboard`

## 4. Scheduled Catalog Broadcast Planner
**File:** `lib/groupCommerce/scheduler.js`

Plans recurring catalog broadcast drafts (daily / hourly / weekly) for group, channel, or social targets. Produces a cron descriptor and a draft post. Live dispatch only occurs when `GROUP_COMMERCE_LIVE_RELAY=true`.

**API:** `POST /api/group-commerce/groups/:id/schedule-broadcast`
```json
{ "frequency": "daily", "timeOfDay": "09:30", "target": "group" }
```

## Safety
- All endpoints return drafts/analytics only — no live messages, posts, or DB writes.
- Sensitive identifiers (phone numbers) are masked in every response.
