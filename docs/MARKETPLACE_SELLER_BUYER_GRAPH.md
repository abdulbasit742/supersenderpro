# Marketplace Seller/Buyer Graph

## Entities
`seller, buyer, product, sku, offer, demand, stock, price, source, channel, group,
social_post, ecommerce_product, order, alert, ai_recommendation`

Each entity carries: `id, type, label, confidence, sourceType, sourceId, sourceName,
firstSeenAt, lastSeenAt, tags[], riskFlags[], metadataSafe{}`. `metadataSafe` only ever
holds masked/derived fields (sku, value, signal, masked ids) — never raw text or PII.

## Relationships
`seller_offers_product, buyer_wants_product, product_has_sku, sku_has_price,
seller_has_stock, source_reported_offer, source_reported_demand, ecommerce_matches_sku,
channel_promoted_product, social_promoted_product, buyer_created_order,
seller_price_changed, stock_changed, ai_recommended_action`

## Detection logic
- **Intent** (offer vs demand): keyword heuristics in `normalizer.detectIntent`
  (e.g. "available/price/stock" → offer; "looking for/need/wanted" → demand). Urdu +
  English verbs supported.
- **SKU**: `skuResolver` slugifies the product label (stopwords removed) and merges
  mentions with ≥0.6 token overlap so "iPhone 13 128GB" variants collapse to one SKU.
- **Price**: unit-aware extraction (ignores `128GB`, `5000mah`, etc.); only **seller
  offers** contribute price points to the radar — buyer budgets stay in buyer metadata.
- **Stock**: signal classifier → `available | low | out`.
- **Risk**: heuristic flags (advance-only, too-good-to-be-true, counterfeit, off-platform).

## Radars & opportunities
- `priceRadar`: latest/min/max/avg per SKU + drop/spike detection (±8% default).
- `stockRadar`: latest signal + low/out opportunities + change detection.
- `opportunityDetector`: profitable resale spread (ecommerce vs lowest seller),
  low-stock-high-demand, hot-demand-low-supply, price-drop-buy.

## Scoring
- **Trust** (`trustScoring`): 0–100 advisory band `trusted/neutral/watch`. No auto-ban.
- **Demand** (`demandScoring`): 0–100 conversion band `hot/warm/cold`.

All derived purely from the graph — deterministic and inspectable.
